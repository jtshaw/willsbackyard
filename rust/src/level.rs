#![allow(dead_code)]

use crate::math::*;
use crate::sprites::*;

// ---------------------------------------------------------------------------
// Collision geometry
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, PartialEq)]
pub enum Surface {
    Grass,
    Leaves,
    Dirt,
    Deck,
    Wood,
    Plastic,
    Metal,
    /// Collides but draws nothing -- the scene art covers it.
    Hidden,
}

#[derive(Clone, Copy)]
pub struct Solid {
    pub r: Rect,
    pub surface: Surface,
    /// Jump-through platform: only blocks downward motion.
    pub one_way: bool,
    /// Index into `Level::movers`, or -1 when static.
    pub mover: i32,
}

impl Solid {
    pub fn new(x: f32, y: f32, w: f32, h: f32, surface: Surface) -> Solid {
        Solid {
            r: rect(x, y, w, h),
            surface,
            one_way: false,
            mover: -1,
        }
    }
    pub fn thru(mut self) -> Solid {
        self.one_way = true;
        self
    }
    pub fn on(mut self, mover: usize) -> Solid {
        self.mover = mover as i32;
        self
    }
}

/// Swings, drifting platforms, the rolling cooler -- anything that carries
/// the player. Solids reference a mover by index and inherit its offset.
#[derive(Clone, Copy, PartialEq)]
pub enum MoverKind {
    /// Back-and-forth along a vector.
    Shuttle,
    /// Pendulum about a pivot above the platform.
    Swing,
    /// Bobs vertically.
    Bob,
}

#[derive(Clone, Copy)]
pub struct Mover {
    pub kind: MoverKind,
    pub origin: V2,
    pub span: V2,
    pub period: f32,
    pub phase: f32,
    /// Filled each tick.
    pub offset: V2,
    pub prev_offset: V2,
    pub angle: f32,
}

impl Mover {
    pub fn shuttle(x: f32, y: f32, dx: f32, dy: f32, period: f32, phase: f32) -> Mover {
        Mover {
            kind: MoverKind::Shuttle,
            origin: v2(x, y),
            span: v2(dx, dy),
            period,
            phase,
            offset: v2(0.0, 0.0),
            prev_offset: v2(0.0, 0.0),
            angle: 0.0,
        }
    }
    pub fn swing(pivot_x: f32, pivot_y: f32, rope: f32, amp: f32, period: f32, phase: f32) -> Mover {
        Mover {
            kind: MoverKind::Swing,
            origin: v2(pivot_x, pivot_y),
            span: v2(rope, amp),
            period,
            phase,
            offset: v2(0.0, 0.0),
            prev_offset: v2(0.0, 0.0),
            angle: 0.0,
        }
    }
    pub fn bob(x: f32, y: f32, amp: f32, period: f32, phase: f32) -> Mover {
        Mover {
            kind: MoverKind::Bob,
            origin: v2(x, y),
            span: v2(0.0, amp),
            period,
            phase,
            offset: v2(0.0, 0.0),
            prev_offset: v2(0.0, 0.0),
            angle: 0.0,
        }
    }

    pub fn update(&mut self, t: f32) {
        self.prev_offset = self.offset;
        let ph = (t / self.period + self.phase) * TAU;
        match self.kind {
            MoverKind::Shuttle => {
                let s = ph.sin();
                self.offset = v2(self.span.x * s, self.span.y * s);
            }
            MoverKind::Bob => {
                self.offset = v2(0.0, self.span.y * ph.sin());
            }
            MoverKind::Swing => {
                let a = self.span.y * ph.sin();
                self.angle = a;
                let rope = self.span.x;
                // Position relative to the rest point directly below the pivot.
                self.offset = v2(a.sin() * rope, rope * (1.0 - a.cos()));
            }
        }
    }

    pub fn velocity(&self, dt: f32) -> V2 {
        if dt <= 0.0 {
            return v2(0.0, 0.0);
        }
        self.offset.sub(self.prev_offset).scale(1.0 / dt)
    }
}

// ---------------------------------------------------------------------------
// Traps
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, PartialEq)]
pub enum TrapKind {
    /// Classic bar trap. Telegraphs with a click, then snaps.
    Snap,
    /// Sticky board: halves speed and needs mashing to break free.
    Glue,
    /// Balanced bucket that tips when you pass beneath.
    Bucket,
    /// Electrified plate that arcs on a fixed rhythm.
    Zapper,
    /// Baited box -- the food is safe to grab, the noise is not.
    Bait,
}

#[derive(Clone, Copy, PartialEq)]
pub enum TrapState {
    Armed,
    /// Click heard, about to fire.
    Triggered,
    Fired,
    /// Player disarmed it: the bait is free to take.
    Disarmed,
}

#[derive(Clone, Copy)]
pub struct Trap {
    pub kind: TrapKind,
    pub pos: V2,
    pub state: TrapState,
    pub timer: f32,
    /// 0..1 animation of the bar / bucket / arc.
    pub anim: f32,
    pub period: f32,
    pub phase: f32,
    pub facing: f32,
    pub holds_food: bool,
    pub noise: f32,
}

impl Trap {
    pub fn new(kind: TrapKind, x: f32, y: f32) -> Trap {
        Trap {
            kind,
            pos: v2(x, y),
            state: TrapState::Armed,
            timer: 0.0,
            anim: 0.0,
            period: 2.2,
            phase: 0.0,
            facing: 1.0,
            holds_food: matches!(kind, TrapKind::Snap | TrapKind::Bait),
            noise: 0.0,
        }
    }
    pub fn rhythm(mut self, period: f32, phase: f32) -> Trap {
        self.period = period;
        self.phase = phase;
        self
    }
    pub fn facing(mut self, f: f32) -> Trap {
        self.facing = f;
        self
    }
    pub fn no_food(mut self) -> Trap {
        self.holds_food = false;
        self
    }

    /// The box that hurts, in world space.
    pub fn hit_box(&self) -> Rect {
        match self.kind {
            TrapKind::Snap => rect(self.pos.x - 70.0, self.pos.y - 52.0, 140.0, 56.0),
            TrapKind::Glue => rect(self.pos.x - 82.0, self.pos.y - 22.0, 164.0, 24.0),
            TrapKind::Bucket => rect(self.pos.x - 80.0, self.pos.y - 20.0, 160.0, 180.0),
            TrapKind::Zapper => rect(self.pos.x - 68.0, self.pos.y - 100.0, 136.0, 100.0),
            TrapKind::Bait => rect(self.pos.x - 10.0, self.pos.y - 10.0, 20.0, 20.0),
        }
    }

    /// The wider box that starts the telegraph.
    pub fn trigger_box(&self) -> Rect {
        match self.kind {
            TrapKind::Snap => rect(self.pos.x - 78.0, self.pos.y - 60.0, 156.0, 64.0),
            TrapKind::Bucket => rect(self.pos.x - 60.0, self.pos.y - 10.0, 120.0, 200.0),
            _ => self.hit_box(),
        }
    }

    /// Where the stealable bait sits.
    pub fn bait_pos(&self) -> V2 {
        match self.kind {
            TrapKind::Snap => v2(self.pos.x + 28.0 * self.facing, self.pos.y - 26.0),
            TrapKind::Bait => v2(self.pos.x, self.pos.y - 34.0),
            _ => self.pos,
        }
    }
}

// ---------------------------------------------------------------------------
// Food
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, PartialEq)]
pub enum Food {
    Crumb,
    Cheese,
    Bacon,
    HotDog,
    Marshmallow,
    Seed,
    Cookie,
    Juice,
    Chips,
}

impl Food {
    pub fn sprite(self) -> u16 {
        match self {
            Food::Crumb => S_FOOD_CRUMB,
            Food::Cheese => S_FOOD_CHEESE,
            Food::Bacon => S_FOOD_BACON,
            Food::HotDog => S_FOOD_HOTDOG,
            Food::Marshmallow => S_FOOD_MARSHMALLOW,
            Food::Seed => S_FOOD_SEED,
            Food::Cookie => S_FOOD_COOKIE,
            Food::Juice => S_FOOD_JUICE,
            Food::Chips => S_FOOD_CHIPS,
        }
    }
    pub fn score(self) -> i32 {
        match self {
            Food::Crumb => 10,
            Food::Seed => 25,
            Food::Cheese => 50,
            Food::Marshmallow => 60,
            Food::Bacon => 75,
            Food::Cookie | Food::Juice | Food::Chips => 120,
            Food::HotDog => 200,
        }
    }
    /// Loot counts toward the hedge unlocking. Crumbs are just points.
    pub fn is_loot(self) -> bool {
        !matches!(self, Food::Crumb | Food::Seed)
    }
    pub fn display_size(self) -> f32 {
        match self {
            Food::Crumb => 34.0,
            Food::Seed => 46.0,
            Food::Cheese => 86.0,
            Food::Bacon => 92.0,
            Food::HotDog => 110.0,
            Food::Marshmallow => 66.0,
            Food::Cookie => 70.0,
            Food::Juice => 72.0,
            Food::Chips => 84.0,
        }
    }
    pub fn label(self) -> u32 {
        // Index into the JS-side name table.
        match self {
            Food::Crumb => 0,
            Food::Cheese => 1,
            Food::Bacon => 2,
            Food::HotDog => 3,
            Food::Marshmallow => 4,
            Food::Seed => 5,
            Food::Cookie => 6,
            Food::Juice => 7,
            Food::Chips => 8,
        }
    }
}

#[derive(Clone, Copy)]
pub struct Pickup {
    pub food: Food,
    pub pos: V2,
    pub taken: bool,
    pub bob: f32,
    /// Grabbing this one is noisy -- it is sitting on a plate or in a bag.
    pub noisy: bool,
    /// Tied to a trap: only collectable once that trap is disarmed.
    pub trap: i32,
}

impl Pickup {
    pub fn new(food: Food, x: f32, y: f32) -> Pickup {
        Pickup {
            food,
            pos: v2(x, y),
            taken: false,
            bob: (x * 0.013).sin() * 3.0,
            noisy: false,
            trap: -1,
        }
    }
    pub fn noisy(mut self) -> Pickup {
        self.noisy = true;
        self
    }
    pub fn on_trap(mut self, t: usize) -> Pickup {
        self.trap = t as i32;
        self
    }
}

// ---------------------------------------------------------------------------
// NPCs
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, PartialEq)]
pub enum NpcKind {
    /// Patrols the deck with a pair of tongs.
    Will,
    /// Stands still, busy with a task, but looks up periodically.
    WillBusy,
    /// Sweeps a flashlight under the hutch.
    WillLight,
    Popcorn,
}

#[derive(Clone, Copy, PartialEq)]
pub enum NpcState {
    Patrol,
    Pause,
    Suspicious,
    Chase,
    Return,
    /// Looking away / occupied: harmless for a window of time.
    Distracted,
}

#[derive(Clone, Copy)]
pub struct Npc {
    pub kind: NpcKind,
    pub pos: V2,
    pub vel: V2,
    pub home: V2,
    pub from: f32,
    pub to: f32,
    pub facing: f32,
    pub speed: f32,
    pub state: NpcState,
    pub state_t: f32,
    pub suspicion: f32,
    pub anim: f32,
    pub look: f32,
    pub cone_range: f32,
    pub cone_half: f32,
    pub bark: f32,
    /// Vertical reach -- Will cannot see you under the deck.
    pub eye_h: f32,
}

impl Npc {
    pub fn new(kind: NpcKind, x: f32, y: f32) -> Npc {
        let (speed, range, half, eye) = match kind {
            NpcKind::Will => (210.0, 760.0, 0.45, 470.0),
            NpcKind::WillBusy => (0.0, 620.0, 0.55, 430.0),
            NpcKind::WillLight => (0.0, 980.0, 0.22, 60.0),
            NpcKind::Popcorn => (330.0, 620.0, 0.62, 150.0),
        };
        Npc {
            kind,
            pos: v2(x, y),
            vel: v2(0.0, 0.0),
            home: v2(x, y),
            from: x - 300.0,
            to: x + 300.0,
            facing: 1.0,
            speed,
            state: if kind == NpcKind::WillBusy || kind == NpcKind::WillLight {
                NpcState::Pause
            } else {
                NpcState::Patrol
            },
            state_t: 0.0,
            suspicion: 0.0,
            anim: 0.0,
            look: 0.0,
            cone_range: range,
            cone_half: half,
            bark: 0.0,
            eye_h: eye,
        }
    }
    pub fn patrol(mut self, from: f32, to: f32) -> Npc {
        self.from = from;
        self.to = to;
        self
    }
    pub fn facing(mut self, f: f32) -> Npc {
        self.facing = f;
        self
    }
    pub fn speed(mut self, s: f32) -> Npc {
        self.speed = s;
        self
    }

    /// Eye position -- where the vision cone originates.
    pub fn eye(&self) -> V2 {
        v2(self.pos.x + 14.0 * self.facing, self.pos.y - self.eye_h)
    }
    pub fn scale(&self) -> f32 {
        match self.kind {
            NpcKind::Popcorn => 1.0,
            _ => 1.0,
        }
    }
}

// ---------------------------------------------------------------------------
// Decoration -- pure scenery, no collision
// ---------------------------------------------------------------------------

#[derive(Clone, Copy)]
pub struct Decor {
    pub sprite: u16,
    pub pos: V2,
    pub w: f32,
    pub h: f32,
    pub rot: f32,
    pub layer: i32,
    pub parallax: f32,
    pub tint: (f32, f32, f32),
    pub alpha: f32,
    pub flip: bool,
    /// Gentle wind sway, in radians.
    pub sway: f32,
}

impl Decor {
    pub fn new(sprite: u16, x: f32, y: f32) -> Decor {
        Decor {
            sprite,
            pos: v2(x, y),
            w: sprite_w(sprite),
            h: sprite_h(sprite),
            rot: 0.0,
            layer: crate::draw::layer::PROP,
            parallax: 1.0,
            tint: (1.0, 1.0, 1.0),
            alpha: 1.0,
            flip: false,
            sway: 0.0,
        }
    }
    pub fn size(mut self, w: f32, h: f32) -> Decor {
        self.w = w;
        self.h = h;
        self
    }
    pub fn scale(mut self, s: f32) -> Decor {
        self.w *= s;
        self.h *= s;
        self
    }
    pub fn width(mut self, w: f32) -> Decor {
        let a = self.h / self.w;
        self.w = w;
        self.h = w * a;
        self
    }
    pub fn layer(mut self, l: i32) -> Decor {
        self.layer = l;
        self
    }
    pub fn par(mut self, p: f32) -> Decor {
        self.parallax = p;
        self
    }
    pub fn tint(mut self, r: f32, g: f32, b: f32) -> Decor {
        self.tint = (r, g, b);
        self
    }
    pub fn shade(mut self, v: f32) -> Decor {
        self.tint = (self.tint.0 * v, self.tint.1 * v, self.tint.2 * v);
        self
    }
    pub fn alpha(mut self, a: f32) -> Decor {
        self.alpha = a;
        self
    }
    pub fn rot(mut self, r: f32) -> Decor {
        self.rot = r;
        self
    }
    pub fn flip(mut self) -> Decor {
        self.flip = true;
        self
    }
    pub fn sway(mut self, s: f32) -> Decor {
        self.sway = s;
        self
    }
    /// Anchors the decor so (x, y) is where it meets the ground.
    pub fn standing(mut self) -> Decor {
        self.pos.y -= self.h * 0.5;
        self
    }
    /// Anchors the decor so (x, y) is its top edge -- used for anything that
    /// hangs down from a platform to the floor.
    pub fn at_top_left_y(mut self) -> Decor {
        self.pos.y += self.h * 0.5;
        self
    }
}

// ---------------------------------------------------------------------------
// Cover -- crouch here and nobody can see you
// ---------------------------------------------------------------------------

#[derive(Clone, Copy)]
pub struct Cover {
    pub r: Rect,
    /// When true you must be sneaking for it to work.
    pub needs_crouch: bool,
}

// ---------------------------------------------------------------------------
// The level itself
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, PartialEq)]
pub enum Mood {
    Afternoon,
    Dusk,
    Night,
    Underside,
}

pub struct Level {
    pub name_id: u32,
    pub hint_id: u32,
    pub mood: Mood,
    pub bounds: Rect,
    pub spawn: V2,
    pub goal: V2,
    pub loot_required: i32,
    pub solids: Vec<Solid>,
    pub movers: Vec<Mover>,
    pub traps: Vec<Trap>,
    pub pickups: Vec<Pickup>,
    pub npcs: Vec<Npc>,
    pub decor: Vec<Decor>,
    pub climbs: Vec<Rect>,
    pub covers: Vec<Cover>,
    pub checkpoints: Vec<V2>,
    /// Walls that block line of sight.
    pub blockers: Vec<Rect>,
    /// Level 4 only: the world is dark outside of lights.
    pub dark: f32,
    pub sky: u16,
    pub ambient: (f32, f32, f32),
}

impl Level {
    pub fn new(name_id: u32, hint_id: u32, mood: Mood) -> Level {
        let (sky, ambient, dark) = match mood {
            Mood::Afternoon => (S_SKY_DAY, (1.0, 1.0, 1.0), 0.0),
            Mood::Dusk => (S_SKY_DUSK, (1.0, 0.93, 0.86), 0.0),
            Mood::Night => (S_SKY_NIGHT, (0.62, 0.68, 0.92), 0.0),
            Mood::Underside => (S_SKY_UNDER, (0.78, 0.73, 0.66), 0.82),
        };
        Level {
            name_id,
            hint_id,
            mood,
            bounds: rect(0.0, -2000.0, 12000.0, 4000.0),
            spawn: v2(300.0, 0.0),
            goal: v2(11000.0, 0.0),
            loot_required: 0,
            solids: Vec::new(),
            movers: Vec::new(),
            traps: Vec::new(),
            pickups: Vec::new(),
            npcs: Vec::new(),
            decor: Vec::new(),
            climbs: Vec::new(),
            covers: Vec::new(),
            checkpoints: Vec::new(),
            blockers: Vec::new(),
            dark,
            sky,
            ambient,
        }
    }

    pub fn solid(&mut self, s: Solid) -> &mut Self {
        self.solids.push(s);
        self
    }
    pub fn decor(&mut self, d: Decor) -> &mut Self {
        self.decor.push(d);
        self
    }

    /// Current world rect of a solid, including any mover offset.
    pub fn solid_rect(&self, s: &Solid) -> Rect {
        if s.mover < 0 {
            s.r
        } else {
            let o = self.movers[s.mover as usize].offset;
            rect(s.r.x + o.x, s.r.y + o.y, s.r.w, s.r.h)
        }
    }
}
