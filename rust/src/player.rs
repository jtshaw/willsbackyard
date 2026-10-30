#![allow(dead_code)]

use crate::level::*;
use crate::math::*;

pub const IN_LEFT: u32 = 1 << 0;
pub const IN_RIGHT: u32 = 1 << 1;
pub const IN_UP: u32 = 1 << 2;
pub const IN_DOWN: u32 = 1 << 3;
pub const IN_JUMP: u32 = 1 << 4;
pub const IN_SNEAK: u32 = 1 << 5;
pub const IN_ACTION: u32 = 1 << 6;
pub const IN_POOP: u32 = 1 << 7;

// Tuning. The rat is light and skittery: quick to top speed, quick to stop.
pub const GRAVITY: f32 = 2900.0;
pub const RUN_SPEED: f32 = 540.0;
pub const SNEAK_SPEED: f32 = 215.0;
pub const BOOST_SPEED: f32 = 790.0;
pub const ACCEL_GROUND: f32 = 5200.0;
pub const ACCEL_AIR: f32 = 2900.0;
pub const FRICTION: f32 = 6200.0;
pub const JUMP_VEL: f32 = -1250.0;
pub const MAX_FALL: f32 = 1750.0;
pub const COYOTE: f32 = 0.11;
pub const JUMP_BUFFER: f32 = 0.13;
pub const CLIMB_SPEED: f32 = 400.0;
/// Lips this small are walked over instead of blocking -- plank edges, kerbs.
pub const STEP_UP: f32 = 30.0;

pub const BODY_W: f32 = 74.0;
pub const BODY_H: f32 = 88.0;
pub const CROUCH_H: f32 = 52.0;

#[derive(Clone, Copy, PartialEq)]
pub enum PlayerState {
    Normal,
    /// Caught in glue: mash to break out.
    Stuck,
    /// Hit by a trap -- brief knockback.
    Hurt,
    /// Caught by Will or Popcorn: the level resets.
    Caught,
    /// Reached the hedge.
    Safe,
}

pub struct Player {
    pub pos: V2,
    pub vel: V2,
    pub facing: f32,
    pub state: PlayerState,
    pub state_t: f32,

    pub on_ground: bool,
    pub ground_normal_y: f32,
    pub coyote: f32,
    pub jump_held: bool,
    pub jump_buffer: f32,
    pub jumps_left: i32,
    pub crouch: bool,
    pub climbing: bool,

    pub health: i32,
    pub invuln: f32,
    pub shield: bool,
    pub speed_boost: f32,
    pub double_jump: f32,
    pub glue: f32,
    pub mash: f32,

    /// Visual state.
    pub run_phase: f32,
    pub anim_t: f32,
    pub squash: f32,
    pub tail_wave: f32,
    pub ear_flop: f32,
    pub lean: f32,

    /// How much noise the rat is making right now (0..1). Feeds suspicion.
    pub noise: f32,
    /// Platform the rat is riding, if any.
    pub riding: i32,
    pub carry_bulge: f32,
    pub prev_action: bool,
    pub action_edge: bool,
}

impl Player {
    pub fn new(spawn: V2) -> Player {
        Player {
            pos: spawn,
            vel: v2(0.0, 0.0),
            facing: 1.0,
            state: PlayerState::Normal,
            state_t: 0.0,
            on_ground: false,
            ground_normal_y: 1.0,
            coyote: 0.0,
            jump_held: false,
            jump_buffer: 0.0,
            jumps_left: 1,
            crouch: false,
            climbing: false,
            health: 3,
            invuln: 0.0,
            shield: false,
            speed_boost: 0.0,
            double_jump: 0.0,
            glue: 0.0,
            mash: 0.0,
            run_phase: 0.0,
            anim_t: 0.0,
            squash: 0.0,
            tail_wave: 0.0,
            ear_flop: 0.0,
            lean: 0.0,
            noise: 0.0,
            riding: -1,
            carry_bulge: 0.0,
            prev_action: false,
            action_edge: false,
        }
    }

    pub fn height(&self) -> f32 {
        if self.crouch {
            CROUCH_H
        } else {
            BODY_H
        }
    }

    /// Collision box, anchored at the feet.
    pub fn body(&self) -> Rect {
        let h = self.height();
        rect(self.pos.x - BODY_W * 0.5, self.pos.y - h, BODY_W, h)
    }

    pub fn center(&self) -> V2 {
        v2(self.pos.x, self.pos.y - self.height() * 0.5)
    }

    pub fn respawn(&mut self, at: V2) {
        self.pos = at;
        self.vel = v2(0.0, 0.0);
        self.state = PlayerState::Normal;
        self.state_t = 0.0;
        self.glue = 0.0;
        self.invuln = 1.1;
        self.climbing = false;
        self.crouch = false;
        self.squash = 0.0;
    }

    pub fn hurt(&mut self, from_x: f32, damage: i32) -> bool {
        if self.invuln > 0.0 || self.state == PlayerState::Caught {
            return false;
        }
        if self.shield {
            self.shield = false;
            self.invuln = 1.0;
            self.vel = v2(sign(self.pos.x - from_x) * 420.0, -520.0);
            return true;
        }
        self.health -= damage;
        self.invuln = 1.35;
        self.state = PlayerState::Hurt;
        self.state_t = 0.0;
        self.vel = v2(sign(self.pos.x - from_x) * 560.0, -620.0);
        self.climbing = false;
        true
    }

    // -----------------------------------------------------------------------

    pub fn update(&mut self, lvl: &Level, input: u32, dt: f32) {
        self.state_t += dt;
        self.anim_t += dt;
        self.invuln = (self.invuln - dt).max(0.0);
        self.speed_boost = (self.speed_boost - dt).max(0.0);
        self.double_jump = (self.double_jump - dt).max(0.0);
        self.carry_bulge = damp(self.carry_bulge, 0.0, 1.2, dt);

        let action = input & IN_ACTION != 0;
        self.action_edge = action && !self.prev_action;
        self.prev_action = action;

        if self.state == PlayerState::Caught || self.state == PlayerState::Safe {
            self.vel.x = damp(self.vel.x, 0.0, 9.0, dt);
            self.vel.y += GRAVITY * dt;
            self.integrate(lvl, dt);
            return;
        }

        if self.state == PlayerState::Hurt && self.state_t > 0.34 {
            self.state = PlayerState::Normal;
        }
        let controllable = self.state == PlayerState::Normal;

        let left = controllable && input & IN_LEFT != 0;
        let right = controllable && input & IN_RIGHT != 0;
        let up = controllable && input & IN_UP != 0;
        let down = controllable && input & IN_DOWN != 0;
        let jump = controllable && input & IN_JUMP != 0;
        let sneak = controllable && input & IN_SNEAK != 0;
        let dir = (right as i32 - left as i32) as f32;

        // ---- glue -----------------------------------------------------------
        if self.glue > 0.0 {
            self.state = PlayerState::Stuck;
            // Mashing left/right or jump works it free.
            if dir != 0.0 && dir != sign(self.mash) {
                self.mash = dir * 1.0;
                self.glue -= 0.32;
            }
            if jump && !self.jump_held {
                self.glue -= 0.26;
            }
            self.glue -= dt * 0.35;
            self.vel.x = damp(self.vel.x, 0.0, 16.0, dt);
            self.noise = 0.55;
            if self.glue <= 0.0 {
                self.glue = 0.0;
                self.state = PlayerState::Normal;
                self.vel.y = -480.0;
            }
        } else if self.state == PlayerState::Stuck {
            self.state = PlayerState::Normal;
        }

        // ---- climbing -------------------------------------------------------
        let body = self.body();
        let in_climb = lvl.climbs.iter().any(|c| c.overlaps(&body));
        if in_climb && (up || down) && self.state == PlayerState::Normal {
            self.climbing = true;
        }
        if !in_climb || self.state != PlayerState::Normal {
            self.climbing = false;
        }

        if self.climbing {
            self.vel.y = (down as i32 - up as i32) as f32 * CLIMB_SPEED;
            self.vel.x = damp(self.vel.x, dir * CLIMB_SPEED * 0.55, 18.0, dt);
            self.jumps_left = 1;
            if jump && !self.jump_held {
                self.climbing = false;
                self.vel.y = JUMP_VEL * 0.84;
                self.coyote = 0.0;
            }
            self.run_phase += dt * 6.0 * (self.vel.y.abs() / CLIMB_SPEED).min(1.0);
            self.noise = 0.1;
        } else if self.state == PlayerState::Normal {
            // ---- horizontal --------------------------------------------------
            self.crouch = sneak || (down && self.on_ground);
            let top = if self.speed_boost > 0.0 {
                BOOST_SPEED
            } else if self.crouch {
                SNEAK_SPEED
            } else {
                RUN_SPEED
            };
            let accel = if self.on_ground { ACCEL_GROUND } else { ACCEL_AIR };
            if dir != 0.0 {
                self.vel.x = approach(self.vel.x, dir * top, accel * dt);
                self.facing = dir;
            } else if self.on_ground {
                self.vel.x = approach(self.vel.x, 0.0, FRICTION * dt);
            } else {
                self.vel.x = approach(self.vel.x, 0.0, ACCEL_AIR * 0.35 * dt);
            }

            // ---- jumping -----------------------------------------------------
            if jump && !self.jump_held {
                self.jump_buffer = JUMP_BUFFER;
            }
            self.jump_buffer = (self.jump_buffer - dt).max(0.0);
            self.coyote = if self.on_ground {
                COYOTE
            } else {
                (self.coyote - dt).max(0.0)
            };

            let max_jumps = if self.double_jump > 0.0 { 2 } else { 1 };
            if self.on_ground {
                self.jumps_left = max_jumps;
            }

            if self.jump_buffer > 0.0 {
                let can_ground = self.coyote > 0.0;
                let can_air = self.jumps_left > 1 || (!can_ground && self.jumps_left > 0 && !self.on_ground && max_jumps > 1);
                if can_ground {
                    self.vel.y = JUMP_VEL * if self.crouch { 0.86 } else { 1.0 };
                    self.jumps_left = max_jumps - 1;
                    self.coyote = 0.0;
                    self.jump_buffer = 0.0;
                    self.on_ground = false;
                    self.squash = -0.34;
                    self.noise = self.noise.max(0.25);
                } else if can_air && max_jumps > 1 && self.jumps_left > 0 {
                    self.vel.y = JUMP_VEL * 0.88;
                    self.jumps_left -= 1;
                    self.jump_buffer = 0.0;
                    self.squash = -0.3;
                }
            }
            // Variable jump height: releasing early clips the arc.
            if !jump && self.vel.y < 0.0 {
                self.vel.y += GRAVITY * 1.55 * dt;
            }
        }

        self.jump_held = jump;

        if !self.climbing {
            self.vel.y = (self.vel.y + GRAVITY * dt).min(MAX_FALL);
        }

        // ---- noise ----------------------------------------------------------
        // Sprinting is loud, sneaking is near-silent, the air is quiet.
        let target_noise = if !self.on_ground {
            0.08
        } else if self.crouch {
            0.03
        } else {
            (self.vel.x.abs() / RUN_SPEED).min(1.0) * 0.55
        };
        self.noise = damp(self.noise, target_noise, 7.0, dt);

        self.integrate(lvl, dt);

        // ---- animation ------------------------------------------------------
        let spd = self.vel.x.abs();
        if self.on_ground && !self.climbing {
            self.run_phase += dt * (6.0 + spd * 0.029);
        }
        self.squash = damp(self.squash, 0.0, 11.0, dt);
        self.lean = damp(self.lean, clamp(self.vel.x / 900.0, -0.3, 0.3), 9.0, dt);
        self.tail_wave += dt * (5.0 + spd * 0.012);
        self.ear_flop = damp(self.ear_flop, clamp(-self.vel.y / 1400.0, -0.5, 0.45), 8.0, dt);
    }

    /// Moves and resolves against level geometry, one axis at a time.
    fn integrate(&mut self, lvl: &Level, dt: f32) {
        // Carry the player along with whatever platform they are standing on.
        if self.riding >= 0 {
            let m = &lvl.movers[self.riding as usize];
            let d = m.offset.sub(m.prev_offset);
            self.pos.x += d.x;
            self.pos.y += d.y;
        }

        let was_on_ground = self.on_ground;
        self.on_ground = false;
        self.riding = -1;

        // --- X ---
        self.pos.x += self.vel.x * dt;
        let b = self.body();
        for s in lvl.solids.iter() {
            if s.one_way {
                continue;
            }
            let r = lvl.solid_rect(s);
            if !b.overlaps(&r) {
                continue;
            }
            // Walk up anything ankle-high rather than stopping dead on it.
            let rise = self.pos.y - r.y;
            if was_on_ground && rise > 0.0 && rise <= STEP_UP {
                let lifted = rect(b.x, r.y - self.height(), b.w, self.height());
                let clear = !lvl.solids.iter().any(|o| {
                    !o.one_way && {
                        let orr = lvl.solid_rect(o);
                        orr.y < r.y - 1.0 && lifted.overlaps(&orr)
                    }
                });
                if clear {
                    self.pos.y = r.y;
                    continue;
                }
            }
            if self.vel.x > 0.0 {
                self.pos.x = r.x - BODY_W * 0.5;
            } else if self.vel.x < 0.0 {
                self.pos.x = r.right() + BODY_W * 0.5;
            }
            self.vel.x = 0.0;
            break;
        }

        // --- Y ---
        let prev_bottom = self.pos.y;
        self.pos.y += self.vel.y * dt;
        let b = self.body();
        let mut best: Option<(f32, i32)> = None;
        for s in lvl.solids.iter() {
            let r = lvl.solid_rect(s);
            if !b.overlaps(&r) {
                continue;
            }
            if self.vel.y >= 0.0 {
                // Landing. One-way platforms only catch you from above.
                if s.one_way && prev_bottom > r.y + 14.0 {
                    continue;
                }
                let top = r.y;
                if best.map_or(true, |(y, _)| top < y) {
                    best = Some((top, s.mover));
                }
            } else if !s.one_way {
                // Head bump.
                self.pos.y = r.bottom() + self.height();
                self.vel.y = 0.0;
            }
        }
        if let Some((top, mover)) = best {
            self.pos.y = top;
            if self.vel.y > 260.0 {
                self.squash = (self.vel.y / MAX_FALL * 0.52).min(0.4);
                if self.vel.y > 900.0 {
                    self.noise = self.noise.max(0.5);
                }
            }
            self.vel.y = 0.0;
            self.on_ground = true;
            self.riding = mover;
        }

        if self.on_ground && !was_on_ground {
            self.ear_flop = -0.4;
        }

        // Level bounds.
        let bx = lvl.bounds;
        self.pos.x = clamp(self.pos.x, bx.x + BODY_W * 0.5, bx.right() - BODY_W * 0.5);
    }
}
