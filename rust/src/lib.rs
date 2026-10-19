// ============================================================================
// Will's Backyard -- game core.
//
// Rust owns simulation and composition; it hands JS a flat list of sprite
// quads each frame and a small block of floats for the HUD. No wasm-bindgen:
// the module is a plain cdylib with C exports, so a single `cargo build` is
// the whole toolchain.
// ============================================================================

mod draw;
mod level;
mod levels;
mod math;
mod npc;
mod player;
mod puppet;
mod scene;
mod sprites;

#[cfg(test)]
mod reach_test;

use draw::*;
use level::*;
use math::*;
use player::*;
use sprites::*;

// ---------------------------------------------------------------------------
// Audio / UI events, drained by JS each frame
// ---------------------------------------------------------------------------

pub mod ev {
    pub const JUMP: u32 = 1 << 0;
    pub const LAND: u32 = 1 << 1;
    pub const PICKUP: u32 = 1 << 2;
    pub const LOOT: u32 = 1 << 3;
    pub const SNAP: u32 = 1 << 4;
    pub const ZAP: u32 = 1 << 5;
    pub const HURT: u32 = 1 << 6;
    pub const ALERT: u32 = 1 << 7;
    pub const BARK: u32 = 1 << 8;
    pub const CAUGHT: u32 = 1 << 9;
    pub const SAFE: u32 = 1 << 10;
    pub const DISARM: u32 = 1 << 11;
    pub const STUCK: u32 = 1 << 12;
    pub const STEP: u32 = 1 << 13;
    pub const CHECKPOINT: u32 = 1 << 14;
    pub const STOLEN: u32 = 1 << 15;
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, PartialEq)]
pub enum Phase {
    Title,
    Intro,
    Playing,
    Caught,
    Complete,
    GameOver,
    Finished,
}

impl Phase {
    fn as_f32(self) -> f32 {
        match self {
            Phase::Title => 0.0,
            Phase::Intro => 1.0,
            Phase::Playing => 2.0,
            Phase::Caught => 3.0,
            Phase::Complete => 4.0,
            Phase::GameOver => 5.0,
            Phase::Finished => 6.0,
        }
    }
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

#[derive(Clone, Copy)]
struct Particle {
    pos: V2,
    vel: V2,
    life: f32,
    max_life: f32,
    size: f32,
    grow: f32,
    spin: f32,
    rot: f32,
    sprite: u16,
    tint: (f32, f32, f32),
    blend: u32,
    gravity: f32,
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

pub struct Game {
    phase: Phase,
    phase_t: f32,
    level_index: usize,
    lvl: Level,
    p: Player,
    cam: V2,
    cam_target: V2,
    shake: f32,
    time: f32,
    level_time: f32,
    score: i32,
    total_score: i32,
    crumbs: i32,
    loot: i32,
    deaths: i32,
    checkpoint: usize,
    particles: Vec<Particle>,
    rng: Rng,
    events: u32,
    tension: f32,
    toast_food: f32,
    toast_t: f32,
    prompt: f32,
    unlocked: usize,
    view_w: f32,
    view_h: f32,
    prev_on_ground: bool,
    step_timer: f32,
    vision: u32,
}

impl Game {
    fn new() -> Game {
        let lvl = levels::build(0);
        let p = Player::new(lvl.spawn);
        Game {
            phase: Phase::Title,
            phase_t: 0.0,
            level_index: 0,
            lvl,
            p,
            cam: v2(0.0, 0.0),
            cam_target: v2(0.0, 0.0),
            shake: 0.0,
            time: 0.0,
            level_time: 0.0,
            score: 0,
            total_score: 0,
            crumbs: 0,
            loot: 0,
            deaths: 0,
            checkpoint: 0,
            particles: Vec::with_capacity(512),
            rng: Rng::new(0xC0FFEE),
            events: 0,
            tension: 0.0,
            toast_food: -1.0,
            toast_t: 0.0,
            prompt: 0.0,
            unlocked: 0,
            view_w: 1920.0,
            view_h: 1080.0,
            prev_on_ground: false,
            step_timer: 0.0,
            vision: VISION_NORMAL,
        }
    }

    fn load_level(&mut self, index: usize) {
        self.level_index = index.min(levels::LEVEL_COUNT - 1);
        self.lvl = levels::build(self.level_index);
        self.p = Player::new(self.lvl.spawn);
        self.checkpoint = 0;
        self.score = 0;
        self.crumbs = 0;
        self.loot = 0;
        self.level_time = 0.0;
        self.particles.clear();
        self.phase = Phase::Intro;
        self.phase_t = 0.0;
        self.tension = 0.0;
        // Trash Night is built around thermal, so it opens in it.
        self.vision = if self.level_index == 5 { VISION_IR } else { VISION_NORMAL };
        let c = self.p.center();
        self.cam = v2(c.x, c.y - 90.0);
        self.cam_target = self.cam;
    }

    fn respawn(&mut self) {
        let at = self.lvl.checkpoints[self.checkpoint.min(self.lvl.checkpoints.len() - 1)];
        self.p.respawn(at);
        // Traps reset so the route is runnable again.
        for t in self.lvl.traps.iter_mut() {
            if t.state != TrapState::Disarmed {
                t.state = TrapState::Armed;
                t.anim = 0.0;
                t.timer = 0.0;
            }
        }
        for n in self.lvl.npcs.iter_mut() {
            n.suspicion = 0.0;
            n.state = match n.kind {
                NpcKind::WillBusy | NpcKind::WillLight => NpcState::Pause,
                _ => NpcState::Patrol,
            };
            n.pos.x = n.home.x;
            n.state_t = 0.0;
        }
        self.phase = Phase::Playing;
        self.phase_t = 0.0;
    }

    // -----------------------------------------------------------------------

    fn burst(&mut self, pos: V2, n: i32, sprite: u16, tint: (f32, f32, f32), speed: f32, size: f32, blend: u32) {
        for _ in 0..n {
            let a = self.rng.range(0.0, TAU);
            let s = self.rng.range(speed * 0.35, speed);
            let life = self.rng.range(0.32, 0.8);
            self.particles.push(Particle {
                pos,
                vel: v2(a.cos() * s, a.sin() * s - speed * 0.35),
                life,
                max_life: life,
                size: size * self.rng.range(0.7, 1.3),
                grow: self.rng.range(-0.4, 0.6),
                spin: self.rng.range(-6.0, 6.0),
                rot: self.rng.range(0.0, TAU),
                sprite,
                tint,
                blend,
                gravity: 900.0,
            });
        }
    }

    fn update_particles(&mut self, dt: f32) {
        for p in self.particles.iter_mut() {
            p.life -= dt;
            p.vel.y += p.gravity * dt;
            p.vel.x *= 1.0 - 2.0 * dt;
            p.pos = p.pos.add(p.vel.scale(dt));
            p.rot += p.spin * dt;
            p.size *= 1.0 + p.grow * dt;
        }
        self.particles.retain(|p| p.life > 0.0);
        if self.particles.len() > 420 {
            let excess = self.particles.len() - 420;
            self.particles.drain(0..excess);
        }
    }

    // -----------------------------------------------------------------------

    fn update_traps(&mut self, dt: f32) {
        let body = self.p.body();
        let can_act = self.p.state == PlayerState::Normal;
        let action = self.p.action_edge;
        let mut prompt = 0.0f32;
        let mut hurt_from: Option<f32> = None;
        let mut noise_spike = 0.0f32;

        for i in 0..self.lvl.traps.len() {
            let (kind, pos, facing) = {
                let t = &self.lvl.traps[i];
                (t.kind, t.pos, t.facing)
            };

            // Disarming: crouch beside a baited trap and press the action key.
            if matches!(kind, TrapKind::Snap | TrapKind::Bait) {
                let t = &self.lvl.traps[i];
                let holds = t.holds_food;
                let armed = t.state == TrapState::Armed;
                let near = (self.p.pos.x - pos.x).abs() < 150.0 && (self.p.pos.y - pos.y).abs() < 180.0;
                if holds && armed && near && self.p.crouch && can_act {
                    prompt = 1.0;
                    if action {
                        self.lvl.traps[i].state = TrapState::Disarmed;
                        self.events |= ev::DISARM;
                        let bp = self.lvl.traps[i].bait_pos();
                        self.burst(bp, 10, S_STAR, (1.0, 0.86, 0.3), 320.0, 36.0, BLEND_ADD);
                        continue;
                    }
                }
            }

            let t = &mut self.lvl.traps[i];
            match kind {
                TrapKind::Snap => match t.state {
                    TrapState::Armed => {
                        if body.overlaps(&t.trigger_box()) {
                            t.state = TrapState::Triggered;
                            t.timer = 0.14;
                        }
                    }
                    TrapState::Triggered => {
                        t.timer -= dt;
                        if t.timer <= 0.0 {
                            t.state = TrapState::Fired;
                            self.events |= ev::SNAP;
                            noise_spike = noise_spike.max(0.9);
                            let hb = t.hit_box();
                            if body.overlaps(&hb) {
                                hurt_from = Some(pos.x);
                            }
                            let bp = v2(pos.x, pos.y - 40.0);
                            self.particles.push(Particle {
                                pos: bp,
                                vel: v2(0.0, -200.0),
                                life: 0.4,
                                max_life: 0.4,
                                size: 120.0,
                                grow: 2.4,
                                spin: 0.0,
                                rot: 0.0,
                                sprite: S_SPLASH_BURST,
                                tint: (1.0, 0.95, 0.7),
                                blend: BLEND_ADD,
                                gravity: 0.0,
                            });
                            self.shake = self.shake.max(9.0);
                        }
                    }
                    _ => {}
                },
                TrapKind::Glue => {
                    if body.overlaps(&t.hit_box()) && self.p.on_ground && self.p.glue <= 0.0 && can_act {
                        self.p.glue = 1.0;
                        self.events |= ev::STUCK;
                        noise_spike = noise_spike.max(0.6);
                    }
                }
                TrapKind::Bucket => {
                    if t.state == TrapState::Armed {
                        if body.overlaps(&t.trigger_box()) {
                            t.state = TrapState::Triggered;
                        }
                    }
                    if t.state == TrapState::Triggered {
                        t.anim += dt * 1.9;
                        if t.anim > 0.3 && body.overlaps(&t.hit_box()) {
                            hurt_from = Some(pos.x);
                        }
                        if t.anim >= 1.0 {
                            t.anim = 1.0;
                            t.state = TrapState::Fired;
                            self.events |= ev::SNAP;
                            self.shake = self.shake.max(12.0);
                            noise_spike = noise_spike.max(1.0);
                        }
                    }
                }
                TrapKind::Zapper => {
                    t.timer += dt;
                    let cycle = t.period;
                    let phase_t = (t.timer + t.phase * cycle) % cycle;
                    let live = phase_t < 0.45;
                    t.anim = if live { 1.0 } else { 0.0 };
                    if live && body.overlaps(&t.hit_box()) {
                        hurt_from = Some(pos.x);
                        self.events |= ev::ZAP;
                    }
                }
                TrapKind::Bait => {
                    // Blundering in without disarming makes a racket.
                    if t.state == TrapState::Armed && body.overlaps(&t.hit_box().inflate(40.0)) {
                        noise_spike = noise_spike.max(0.85);
                    }
                }
            }
            let _ = facing;
        }

        self.prompt = prompt;
        if noise_spike > 0.0 {
            self.p.noise = self.p.noise.max(noise_spike);
        }
        if let Some(x) = hurt_from {
            if self.p.hurt(x, 1) {
                self.events |= ev::HURT;
                self.shake = self.shake.max(14.0);
                let c = self.p.center();
                self.burst(c, 10, S_STAR, (1.0, 0.5, 0.4), 420.0, 40.0, BLEND_ALPHA);
            }
        }
    }

    fn update_pickups(&mut self) {
        let body = self.p.body().inflate(26.0);
        let mut taken: Vec<(V2, Food, bool)> = Vec::new();
        for i in 0..self.lvl.pickups.len() {
            let guarded = {
                let pk = &self.lvl.pickups[i];
                pk.trap >= 0
                    && !matches!(
                        self.lvl.traps[pk.trap as usize].state,
                        TrapState::Disarmed | TrapState::Fired
                    )
            };
            let pk = &mut self.lvl.pickups[i];
            if pk.taken || guarded {
                continue;
            }
            let r = rect(pk.pos.x - 40.0, pk.pos.y - 40.0, 80.0, 80.0);
            if body.overlaps(&r) {
                pk.taken = true;
                taken.push((pk.pos, pk.food, pk.noisy));
            }
        }
        for (pos, food, noisy) in taken {
            self.score += food.score();
            self.p.carry_bulge = (self.p.carry_bulge + 0.5).min(1.0);
            if food.is_loot() {
                self.loot += 1;
                self.events |= ev::LOOT;
            } else {
                self.crumbs += 1;
                self.events |= ev::PICKUP;
            }
            if food == Food::Cheese && self.p.health < 3 {
                self.p.health += 1;
            }
            match food {
                Food::Bacon => self.p.speed_boost = 7.0,
                Food::Seed => self.p.double_jump = 11.0,
                Food::Marshmallow => self.p.shield = true,
                _ => {}
            }
            if noisy {
                self.p.noise = self.p.noise.max(0.8);
            }
            self.toast_food = food.label() as f32;
            self.toast_t = 1.8;
            self.burst(pos, 9, S_STAR, (1.0, 0.85, 0.35), 360.0, 34.0, BLEND_ADD);
        }
    }

    fn update_goal(&mut self) {
        if self.p.state == PlayerState::Safe {
            return;
        }
        let g = self.lvl.goal;
        let unlocked = self.loot >= self.lvl.loot_required;
        let d = (self.p.pos.x - g.x).abs();
        if d < 150.0 && (self.p.pos.y - g.y).abs() < 420.0 && unlocked {
            self.p.state = PlayerState::Safe;
            self.p.state_t = 0.0;
            self.events |= ev::SAFE;
            self.phase = Phase::Complete;
            self.phase_t = 0.0;
            self.total_score += self.score + (self.p.health * 150) + 400;
            if self.level_index + 1 > self.unlocked {
                self.unlocked = self.level_index + 1;
            }
        }
    }

    fn update_checkpoints(&mut self) {
        for (i, c) in self.lvl.checkpoints.iter().enumerate() {
            if i > self.checkpoint && (self.p.pos.x - c.x).abs() < 220.0 && (self.p.pos.y - c.y).abs() < 300.0 {
                self.checkpoint = i;
                self.events |= ev::CHECKPOINT;
            }
        }
    }

    fn update_camera(&mut self, dt: f32) {
        let c = self.p.center();
        // Look ahead in the direction of travel, and a little further when fast.
        let lead = clamp(self.p.vel.x * 0.42, -340.0, 340.0);
        let vert = clamp(self.p.vel.y * 0.10, -150.0, 220.0);
        self.cam_target = v2(c.x + lead, c.y - 70.0 + vert);

        self.cam.x = damp(self.cam.x, self.cam_target.x, 6.0, dt);
        self.cam.y = damp(self.cam.y, self.cam_target.y, 4.4, dt);

        // Keep the camera inside the level.
        let half_w = self.view_w * 0.5;
        let half_h = self.view_h * 0.5;
        let b = self.lvl.bounds;
        if b.w > self.view_w {
            self.cam.x = clamp(self.cam.x, b.x + half_w, b.right() - half_w);
        }
        self.cam.y = clamp(self.cam.y, b.y + half_h, b.bottom() - half_h);
    }

    // -----------------------------------------------------------------------

    fn tick(&mut self, dt: f32, input: u32) {
        self.time += dt;
        self.phase_t += dt;
        self.shake = damp(self.shake, 0.0, 7.0, dt);
        self.toast_t = (self.toast_t - dt).max(0.0);

        match self.phase {
            Phase::Title | Phase::GameOver | Phase::Finished => {
                self.p.anim_t += dt;
                self.update_particles(dt);
                return;
            }
            Phase::Intro => {
                self.level_time = 0.0;
                // Hold on the establishing beat, then hand over control.
                for m in self.lvl.movers.iter_mut() {
                    m.update(self.time);
                }
                self.p.update(&self.lvl, 0, dt);
                self.update_camera(dt);
                if self.phase_t > 1.5 {
                    self.phase = Phase::Playing;
                    self.phase_t = 0.0;
                }
                self.update_particles(dt);
                return;
            }
            Phase::Caught => {
                self.p.update(&self.lvl, 0, dt);
                for m in self.lvl.movers.iter_mut() {
                    m.update(self.time);
                }
                self.update_camera(dt);
                self.update_particles(dt);
                if self.phase_t > 1.25 {
                    if self.p.health <= 0 {
                        self.phase = Phase::GameOver;
                        self.phase_t = 0.0;
                    } else {
                        self.respawn();
                    }
                }
                return;
            }
            Phase::Complete => {
                self.p.update(&self.lvl, 0, dt);
                for m in self.lvl.movers.iter_mut() {
                    m.update(self.time);
                }
                self.update_camera(dt);
                self.update_particles(dt);
                // Confetti of leaves at the hedge.
                if self.phase_t < 1.0 && self.rng.chance(0.5) {
                    let g = self.lvl.goal;
                    let pos = v2(g.x + self.rng.range(-200.0, 200.0), g.y - 400.0);
                    self.particles.push(Particle {
                        pos,
                        vel: v2(self.rng.range(-160.0, 160.0), self.rng.range(-420.0, -120.0)),
                        life: 1.6,
                        max_life: 1.6,
                        size: 46.0,
                        grow: 0.0,
                        spin: self.rng.range(-5.0, 5.0),
                        rot: 0.0,
                        sprite: S_LEAF,
                        tint: (0.95, 0.72, 0.3),
                        blend: BLEND_ALPHA,
                        gravity: 500.0,
                    });
                }
                return;
            }
            Phase::Playing => {}
        }

        self.level_time += dt;

        for m in self.lvl.movers.iter_mut() {
            m.update(self.time);
        }

        let was_ground = self.p.on_ground;
        self.p.update(&self.lvl, input, dt);

        if self.p.on_ground && !was_ground && self.p.vel.y.abs() < 1.0 {
            self.events |= ev::LAND;
            let f = v2(self.p.pos.x, self.p.pos.y);
            self.burst(f, 5, S_DUST, (0.85, 0.80, 0.70), 190.0, 44.0, BLEND_ALPHA);
        }
        if !self.p.on_ground && was_ground && self.p.vel.y < -200.0 {
            self.events |= ev::JUMP;
        }

        // Footstep puffs and the tick that drives the audio step sound.
        if self.p.on_ground && self.p.vel.x.abs() > 120.0 && !self.p.crouch {
            self.step_timer -= dt * (0.6 + self.p.vel.x.abs() / RUN_SPEED);
            if self.step_timer <= 0.0 {
                self.step_timer = 0.28;
                self.events |= ev::STEP;
                let f = v2(self.p.pos.x - self.p.facing * 24.0, self.p.pos.y);
                self.burst(f, 2, S_DUST, (0.88, 0.84, 0.74), 110.0, 26.0, BLEND_ALPHA);
            }
        }

        self.update_traps(dt);
        self.update_pickups();
        self.update_checkpoints();

        let res = npc::update(&mut self.lvl, &mut self.p, dt, self.time, self.loot);
        self.tension = res.tension;
        if res.new_alert {
            self.events |= ev::ALERT;
            self.shake = self.shake.max(7.0);
        }
        if res.bark {
            self.events |= ev::BARK;
        }
        if res.bitten {
            self.events |= ev::HURT;
            self.shake = self.shake.max(14.0);
            let c = self.p.center();
            self.burst(c, 10, S_STAR, (1.0, 0.45, 0.35), 420.0, 38.0, BLEND_ALPHA);
        }
        if res.stolen > 0 {
            // Losing loot can re-lock the hedge, which is the whole threat.
            self.loot = (self.loot - res.stolen).max(0);
            self.score = (self.score - 120 * res.stolen).max(0);
            self.events |= ev::STOLEN;
            self.shake = self.shake.max(13.0);
            self.toast_food = -2.0;          // the HUD reads this as a robbery
            self.toast_t = 2.2;
            let c = self.p.center();
            self.burst(c, 12, S_STAR, (1.0, 0.5, 0.3), 420.0, 36.0, BLEND_ALPHA);
        }
        if res.caught && self.p.state != PlayerState::Safe {
            self.p.state = PlayerState::Caught;
            self.p.state_t = 0.0;
            self.p.health -= 1;
            self.deaths += 1;
            self.events |= ev::CAUGHT;
            self.shake = self.shake.max(20.0);
            self.phase = Phase::Caught;
            self.phase_t = 0.0;
            let c = self.p.center();
            self.burst(c, 16, S_STAR, (1.0, 0.45, 0.35), 460.0, 44.0, BLEND_ALPHA);
        }

        // Falling out of the world.
        if self.p.pos.y > self.lvl.bounds.bottom() - 200.0 {
            self.p.health -= 1;
            self.deaths += 1;
            self.events |= ev::HURT;
            self.phase = Phase::Caught;
            self.phase_t = 0.6;
            self.p.state = PlayerState::Caught;
        }

        if self.p.health <= 0 && self.phase == Phase::Playing {
            self.phase = Phase::Caught;
            self.phase_t = 0.0;
            self.p.state = PlayerState::Caught;
            self.events |= ev::CAUGHT;
        }

        self.update_goal();
        self.update_camera(dt);
        self.update_particles(dt);
        self.prev_on_ground = self.p.on_ground;
    }

    // -----------------------------------------------------------------------

    fn render(&mut self, dl: &mut DrawList) {
        dl.clear();
        dl.vision = self.vision;
        dl.view_w = self.view_w;
        dl.view_h = self.view_h;
        dl.zoom = 1.0;

        // Screen shake, applied through the camera.
        let s = self.shake;
        let sx = if s > 0.1 {
            (self.time * 47.0).sin() * s
        } else {
            0.0
        };
        let sy = if s > 0.1 {
            (self.time * 61.0).cos() * s
        } else {
            0.0
        };
        dl.cam_x = self.cam.x + sx;
        dl.cam_y = self.cam.y + sy;

        scene::draw_sky(dl, &self.lvl, self.time);
        scene::draw_decor(dl, &self.lvl, self.time);
        scene::draw_solids(dl, &self.lvl);
        scene::draw_traps(dl, &self.lvl, self.time);
        scene::draw_pickups(dl, &self.lvl, self.time);
        scene::draw_npcs(dl, &self.lvl, self.time);

        // The rat, with a contact shadow that tightens as it lands.
        if self.phase != Phase::Title {
            let fade = if self.p.state == PlayerState::Safe {
                (1.0 - self.p.state_t * 0.8).max(0.0)
            } else {
                1.0
            };
            if fade > 0.01 {
                let ground_gap = 1.0;
                dl.shadow(
                    self.p.pos.x,
                    self.p.pos.y - 4.0,
                    150.0 * ground_gap,
                    0.42 * fade,
                );
                // Render from a copy; `render` holds &self, the puppet wants &Player.
                let mut pp = clone_player(&self.p);
                if fade < 1.0 {
                    // Slipping into the hedge: shrink and fade.
                    pp.pos.y -= (1.0 - fade) * 40.0;
                }
                puppet::draw_rat(dl, &pp, self.time);
            }
        }

        // Interaction prompt.
        if self.prompt > 0.0 {
            let c = self.p.center();
            dl.push(
                Sp::new(S_FX_QUESTION, c.x, c.y - 170.0)
                    .height(110.0)
                    .rot((self.time * 5.0).sin() * 0.1)
                    .layer(layer::FX),
            );
        }

        // Powerup auras.
        if self.p.shield {
            let c = self.p.center();
            dl.push(
                Sp::new(S_LIGHT_BLOB, c.x, c.y)
                    .width(290.0 + (self.time * 4.0).sin() * 14.0)
                    .tint(0.7, 0.9, 1.0)
                    .alpha(0.42)
                    .blend(BLEND_ADD)
                    .layer(layer::FX),
            );
        }
        if self.p.speed_boost > 0.0 {
            for i in 0..3 {
                let f = i as f32 * 0.06;
                let c = self.p.center();
                dl.push(
                    Sp::new(S_RAT_BODY, c.x - self.p.vel.x * f, c.y)
                        .scale(0.9)
                        .flip_x(self.p.facing < 0.0)
                        .tint(1.0, 0.8, 0.5)
                        .alpha(0.16)
                        .blend(BLEND_ADD)
                        .layer(layer::ACTOR_BACK),
                );
            }
        }

        // Particles.
        for p in self.particles.iter() {
            let t = (p.life / p.max_life).max(0.0);
            dl.push(
                Sp::new(p.sprite, p.pos.x, p.pos.y)
                    .width(p.size)
                    .rot(p.rot)
                    .tint(p.tint.0, p.tint.1, p.tint.2)
                    .alpha(t * t.sqrt())
                    .blend(p.blend)
                    .layer(layer::FX),
            );
        }

        // The hedge glows once you have enough loot to be let in.
        if self.loot >= self.lvl.loot_required {
            let g = self.lvl.goal;
            dl.push(
                Sp::new(S_LIGHT_BLOB, g.x, g.y - 160.0)
                    .width(620.0 + (self.time * 2.2).sin() * 40.0)
                    .tint(0.75, 1.0, 0.65)
                    .alpha(0.3)
                    .blend(BLEND_ADD)
                    .layer(layer::FX),
            );
            for i in 0..5 {
                let ph = self.time * 1.4 + i as f32 * 1.26;
                dl.push(
                    Sp::new(S_STAR, g.x + (ph).sin() * 190.0, g.y - 220.0 - (ph * 0.7).cos() * 140.0)
                        .width(34.0)
                        .rot(ph)
                        .tint(0.9, 1.0, 0.7)
                        .alpha(0.6)
                        .blend(BLEND_ADD)
                        .layer(layer::FX),
                );
            }
        }

        scene::draw_darkness(dl, &self.lvl, &self.p, self.time);
        if self.vision == VISION_IR {
            scene::draw_ir_overlay(dl, self.time);
        }
        scene::draw_overlay(dl, &self.lvl);

        dl.sort();
    }

    fn write_state(&self, out: &mut [f32]) {
        let amb = self.lvl.ambient;
        let clear = match self.lvl.mood {
            Mood::Afternoon => (0.60 * amb.0, 0.80 * amb.1, 0.92 * amb.2),
            Mood::Dusk => (0.35, 0.33, 0.52),
            Mood::Night => (0.05, 0.07, 0.17),
            Mood::Underside => (0.07, 0.05, 0.04),
        };
        let g = self.lvl.goal;
        let span = (g.x - self.lvl.spawn.x).abs().max(1.0);
        let progress = clamp((self.p.pos.x - self.lvl.spawn.x) / span, 0.0, 1.0);

        out[0] = self.p.health as f32;
        out[1] = self.score as f32;
        out[2] = self.loot as f32;
        out[3] = self.lvl.loot_required as f32;
        out[4] = clamp(self.tension, 0.0, 1.0);
        out[5] = self.phase.as_f32();
        out[6] = self.level_index as f32;
        out[7] = self.level_time;
        out[8] = progress;
        out[9] = clear.0;
        out[10] = clear.1;
        out[11] = clear.2;
        out[12] = self.toast_food;
        out[13] = self.toast_t;
        out[14] = if self.p.shield { 1.0 } else { 0.0 };
        out[15] = self.p.speed_boost;
        out[16] = self.p.double_jump;
        out[17] = self.prompt;
        out[18] = self.crumbs as f32;
        out[19] = self.deaths as f32;
        out[20] = self.total_score as f32;
        out[21] = self.lvl.name_id as f32;
        out[22] = self.lvl.hint_id as f32;
        out[23] = self.unlocked as f32;
        out[24] = levels::LEVEL_COUNT as f32;
        out[25] = self.phase_t;
        out[26] = if self.p.glue > 0.0 { self.p.glue } else { 0.0 };
        // Diagnostic tail -- read by tools/test_core.js.
        out[27] = self.p.pos.x;
        out[28] = self.p.pos.y;
        out[29] = self.p.vel.x;
        out[30] = self.p.vel.y;
        out[31] = if self.p.on_ground { 1.0 } else { 0.0 };
        out[32] = self.p.state as i32 as f32;
        out[33] = if self.p.crouch { 1.0 } else { 0.0 };
        // Standing at the hedge without enough loot needs to say so out loud.
        let near_goal = (self.p.pos.x - g.x).abs() < 760.0 && (self.p.pos.y - g.y).abs() < 620.0;
        let short_by = (self.lvl.loot_required - self.loot).max(0);
        out[34] = if near_goal && short_by > 0 { 1.0 } else { 0.0 };
        out[35] = short_by as f32;
        out[36] = match self.lvl.mood {
            Mood::Afternoon => 0.0,
            Mood::Dusk => 1.0,
            Mood::Night => 2.0,
            Mood::Underside => 3.0,
        };
        out[37] = self.vision as f32;
    }
}

/// Shallow copy of the player used purely for rendering.
fn clone_player(p: &Player) -> Player {
    let mut c = Player::new(p.pos);
    c.vel = p.vel;
    c.facing = p.facing;
    c.state = p.state;
    c.state_t = p.state_t;
    c.on_ground = p.on_ground;
    c.crouch = p.crouch;
    c.climbing = p.climbing;
    c.health = p.health;
    c.invuln = p.invuln;
    c.shield = p.shield;
    c.speed_boost = p.speed_boost;
    c.double_jump = p.double_jump;
    c.glue = p.glue;
    c.run_phase = p.run_phase;
    c.anim_t = p.anim_t;
    c.squash = p.squash;
    c.tail_wave = p.tail_wave;
    c.ear_flop = p.ear_flop;
    c.lean = p.lean;
    c.carry_bulge = p.carry_bulge;
    c
}

// ---------------------------------------------------------------------------
// wasm exports
// ---------------------------------------------------------------------------

static mut GAME: Option<Game> = None;
static mut DL: Option<DrawList> = None;
static mut DRAW_BUF: [f32; MAX_CMDS * CMD_STRIDE] = [0.0; MAX_CMDS * CMD_STRIDE];
static mut STATE_BUF: [f32; 48] = [0.0; 48];
static mut DRAW_COUNT: u32 = 0;

#[inline]
fn game() -> &'static mut Game {
    unsafe {
        let g = &mut *core::ptr::addr_of_mut!(GAME);
        if g.is_none() {
            *g = Some(Game::new());
        }
        g.as_mut().unwrap()
    }
}

#[inline]
fn dl() -> &'static mut DrawList {
    unsafe {
        let d = &mut *core::ptr::addr_of_mut!(DL);
        if d.is_none() {
            *d = Some(DrawList::new());
        }
        d.as_mut().unwrap()
    }
}

#[no_mangle]
pub extern "C" fn wb_init(seed: u32) {
    let g = game();
    *g = Game::new();
    g.rng = Rng::new(seed);
}

#[no_mangle]
pub extern "C" fn wb_start_level(index: u32) {
    let g = game();
    g.load_level(index as usize);
    if index == 0 {
        g.total_score = 0;
        g.deaths = 0;
    }
}

#[no_mangle]
pub extern "C" fn wb_set_phase(phase: u32) {
    let g = game();
    g.phase = match phase {
        0 => Phase::Title,
        1 => Phase::Intro,
        2 => Phase::Playing,
        3 => Phase::Caught,
        4 => Phase::Complete,
        5 => Phase::GameOver,
        _ => Phase::Finished,
    };
    g.phase_t = 0.0;
}

#[no_mangle]
pub extern "C" fn wb_retry() {
    let g = game();
    g.p.health = 3;
    g.respawn();
}

#[no_mangle]
pub extern "C" fn wb_tick(dt: f32, input: u32, view_w: f32, view_h: f32) {
    let g = game();
    g.view_w = view_w;
    g.view_h = view_h;
    // Clamp the step so a backgrounded tab cannot tunnel the rat through walls.
    let step = clamp(dt, 0.0, 1.0 / 30.0);
    g.tick(step, input);

    let d = dl();
    g.render(d);
    unsafe {
        let buf = &mut *core::ptr::addr_of_mut!(DRAW_BUF);
        DRAW_COUNT = d.write(buf) as u32;
        let sb = &mut *core::ptr::addr_of_mut!(STATE_BUF);
        g.write_state(sb);
    }
}

#[no_mangle]
pub extern "C" fn wb_draw_ptr() -> *const f32 {
    core::ptr::addr_of!(DRAW_BUF) as *const f32
}

#[no_mangle]
pub extern "C" fn wb_draw_count() -> u32 {
    unsafe { DRAW_COUNT }
}

#[no_mangle]
pub extern "C" fn wb_state_ptr() -> *const f32 {
    core::ptr::addr_of!(STATE_BUF) as *const f32
}

/// Returns the pending audio/UI events and clears them.
#[no_mangle]
pub extern "C" fn wb_take_events() -> u32 {
    let g = game();
    let e = g.events;
    g.events = 0;
    e
}

/// Debug aid: drop the rat anywhere in the level. Used by tools/render.js to
/// frame screenshots of specific set pieces.
#[no_mangle]
pub extern "C" fn wb_debug_teleport(x: f32, y: f32) {
    let g = game();
    g.p.pos = v2(x, y);
    g.p.vel = v2(0.0, 0.0);
    g.cam = v2(x, y - 90.0);
    g.cam_target = g.cam;
    g.phase = Phase::Playing;
}

/// 0 = normal, 1 = infrared. Only meaningful on the dark levels.
#[no_mangle]
pub extern "C" fn wb_set_vision(mode: u32) {
    game().vision = if mode == 1 { VISION_IR } else { VISION_NORMAL };
}

#[no_mangle]
pub extern "C" fn wb_level_count() -> u32 {
    levels::LEVEL_COUNT as u32
}
