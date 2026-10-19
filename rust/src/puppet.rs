#![allow(dead_code)]

use crate::draw::{layer, DrawList, Sp};
use crate::level::*;
use crate::math::*;
use crate::player::{Player, PlayerState};
use crate::sprites::*;

/// A paper puppet assembled around an origin at the character's feet.
/// Everything is authored facing right; `facing` mirrors the whole rig.
pub struct Rig {
    pub origin: V2,
    pub facing: f32,
    pub scale: f32,
    pub shade: f32,
    pub alpha: f32,
    /// Whole-body tilt, which sells the cut-out-on-a-stick look.
    pub tilt: f32,
}

impl Rig {
    pub fn new(origin: V2, facing: f32, scale: f32) -> Rig {
        Rig {
            origin,
            facing,
            scale,
            shade: 1.0,
            alpha: 1.0,
            tilt: 0.0,
        }
    }

    /// Local (forward, up-negative) coordinates into world space.
    fn pt(&self, lx: f32, ly: f32) -> V2 {
        let p = v2(lx * self.facing, ly).scale(self.scale).rot(self.tilt);
        self.origin.add(p)
    }

    fn ang(&self, a: f32) -> f32 {
        a * self.facing + self.tilt
    }

    /// A body part centred on a local point.
    pub fn part(&self, dl: &mut DrawList, sprite: u16, lx: f32, ly: f32, s: f32, angle: f32, lay: i32) {
        let c = self.pt(lx, ly);
        dl.push(
            Sp::new(sprite, c.x, c.y)
                .scale(s * self.scale)
                .rot(self.ang(angle))
                .flip_x(self.facing < 0.0)
                .shade(self.shade)
                .alpha(self.alpha)
                .layer(lay),
        );
    }

    /// A limb hanging from a joint. `angle` of 0 points straight down.
    /// The angle is clamped either side of vertical: a leg that swung past
    /// horizontal would read as upside down, paw in the air.
    pub fn limb(&self, dl: &mut DrawList, sprite: u16, jx: f32, jy: f32, s: f32, angle: f32, lay: i32) {
        let h = sprite_h(sprite) * s * self.scale;
        let a = self.ang(clamp(angle, -1.35, 1.35));
        let joint = self.pt(jx, jy);
        let c = joint.add(v2(0.0, h * 0.5).rot(a));
        dl.push(
            Sp::new(sprite, c.x, c.y)
                .scale(s * self.scale)
                .rot(a)
                .flip_x(self.facing < 0.0)
                .shade(self.shade)
                .alpha(self.alpha)
                .layer(lay),
        );
    }

    /// A limb extending forward from a joint (tails, tongs).
    pub fn spur(&self, dl: &mut DrawList, sprite: u16, jx: f32, jy: f32, s: f32, angle: f32, lay: i32) {
        let w = sprite_w(sprite) * s * self.scale;
        let a = self.ang(angle);
        let joint = self.pt(jx, jy);
        let c = joint.add(v2(w * 0.5 * self.facing, 0.0).rot(a));
        dl.push(
            Sp::new(sprite, c.x, c.y)
                .scale(s * self.scale)
                .rot(a)
                .flip_x(self.facing < 0.0)
                .shade(self.shade)
                .alpha(self.alpha)
                .layer(lay),
        );
    }
}

// ---------------------------------------------------------------------------
// The rat
// ---------------------------------------------------------------------------

pub const RAT_SCALE: f32 = 0.92;

pub fn draw_rat(dl: &mut DrawList, p: &Player, t: f32) {
    // Blink out of existence briefly on each i-frame flash.
    let flashing = p.invuln > 0.0 && ((t * 22.0) as i32) % 2 == 0;
    let alpha = if flashing { 0.45 } else { 1.0 };

    let airborne = !p.on_ground && !p.climbing;
    let run = p.run_phase;
    let spd = p.vel.x.abs() / crate::player::RUN_SPEED;

    // Squash and stretch, driven by landings and take-offs.
    let sq = p.squash;
    let sx = 1.0 + sq * 0.55;
    let sy = 1.0 - sq * 0.55;

    let crouch = if p.crouch { 0.70 } else { 1.0 };
    let bob = if p.on_ground && !p.climbing {
        (run * 2.0).sin() * 3.4 * spd.min(1.0)
    } else {
        0.0
    };

    let mut rig = Rig::new(p.pos, p.facing, RAT_SCALE);
    rig.alpha = alpha;
    rig.tilt = p.lean * 0.45;
    if p.state == PlayerState::Caught {
        rig.tilt = (t * 9.0).sin() * 0.25;
    }

    let body_y = (-54.0 * crouch + bob) * sy;
    let hip = v2(-24.0, body_y + 14.0);
    let shoulder = v2(30.0, body_y + 4.0);

    // ---- tail: three overlapping segments, trailing behind -----------------
    let wave = p.tail_wave;
    let tail_base = v2(-58.0, body_y - 2.0);
    let mut ta = 0.30 + (wave).sin() * 0.20 - p.vel.x * 0.00018 * p.facing;
    if airborne {
        ta += clamp(p.vel.y / 1400.0, -0.5, 0.6);
    }
    let seg_scale = [0.52f32, 0.44, 0.34];
    let mut jx = tail_base.x;
    let mut jy = tail_base.y;
    for (i, &s) in seg_scale.iter().enumerate() {
        let a = ta + (wave - i as f32 * 0.7).sin() * 0.26;
        // Tail segments point backwards, so flip the forward axis.
        let w = sprite_w(S_RAT_TAIL) * s * RAT_SCALE;
        let dir = v2(-1.0 * p.facing, 0.0).rot(a * p.facing + rig.tilt);
        let joint = rig.pt(jx, jy);
        let c = joint.add(dir.scale(w * 0.5));
        dl.push(
            Sp::new(S_RAT_TAIL, c.x, c.y)
                .scale(s * RAT_SCALE)
                .rot(a * p.facing + rig.tilt)
                .flip_x(p.facing > 0.0)
                .alpha(alpha)
                .layer(layer::ACTOR_BACK),
        );
        let adv = dir.scale(w).scale(1.0 / RAT_SCALE);
        jx += adv.x * p.facing;
        jy += adv.y;
        ta *= 0.82;
    }

    // ---- far-side limbs ----------------------------------------------------
    let (fl, bl) = leg_phase(p, run, airborne, spd);
    rig.shade = 0.78;
    rig.limb(dl, S_RAT_LEG, hip.x, hip.y, 0.95 * crouch, bl, layer::ACTOR_BACK);
    rig.limb(dl, S_RAT_ARM, shoulder.x, shoulder.y, 0.85, -bl * 0.7 + 0.2, layer::ACTOR_BACK);
    rig.shade = 1.0;

    // ---- body ---------------------------------------------------------------
    let c = rig.pt(0.0, body_y);
    dl.push(
        Sp::new(S_RAT_BODY, c.x, c.y)
            .scale_xy(RAT_SCALE * sx, RAT_SCALE * sy * crouch)
            .rot(rig.tilt + p.lean * 0.2)
            .flip_x(p.facing < 0.0)
            .alpha(alpha)
            .layer(layer::ACTOR),
    );

    // ---- head ---------------------------------------------------------------
    let head_y = body_y - 30.0 * crouch;
    let head_x = 46.0;
    let nod = (run * 2.0).sin() * 0.045 * spd + p.ear_flop * 0.12;
    let head_a = nod + p.lean * 0.25 + if p.crouch { 0.14 } else { 0.0 };

    // ears first, so they sit behind the skull
    rig.shade = 0.88;
    rig.part(dl, S_RAT_EAR, head_x - 14.0, head_y - 34.0, 0.92, head_a - 0.3 + p.ear_flop, layer::ACTOR);
    rig.shade = 1.0;
    rig.part(dl, S_RAT_HEAD, head_x, head_y, 1.0, head_a, layer::ACTOR_FRONT);
    rig.part(dl, S_RAT_EAR, head_x - 2.0, head_y - 36.0, 1.0, head_a - 0.18 + p.ear_flop * 1.2, layer::ACTOR_FRONT);

    // eye, nudged toward the direction of travel
    let eye_shift = clamp(p.vel.x * 0.004, -3.0, 3.0) * p.facing;
    rig.part(dl, S_RAT_EYE, head_x + 8.0 + eye_shift, head_y - 10.0, 0.72, head_a, layer::ACTOR_FRONT);

    // ---- near-side limbs ----------------------------------------------------
    rig.limb(dl, S_RAT_LEG, hip.x + 10.0, hip.y, 1.0 * crouch, fl, layer::ACTOR_FRONT);
    rig.limb(dl, S_RAT_ARM, shoulder.x + 6.0, shoulder.y, 0.9, -fl * 0.7 + 0.2, layer::ACTOR_FRONT);

    // ---- the swag sack, bulging as you steal --------------------------------
    if p.carry_bulge > 0.02 {
        let s = 0.7 + p.carry_bulge * 0.5;
        rig.part(
            dl,
            S_RAT_SACK,
            -34.0,
            body_y + 6.0,
            s,
            (t * 7.0).sin() * 0.14,
            layer::ACTOR_FRONT,
        );
    }
}

/// Front / back leg swing angles for the current gait.
fn leg_phase(p: &Player, run: f32, airborne: bool, spd: f32) -> (f32, f32) {
    if p.climbing {
        let s = (run * 1.6).sin();
        return (s * 0.6, -s * 0.6);
    }
    if airborne {
        // Tuck going up, reach going down.
        let v = clamp(p.vel.y / 900.0, -1.0, 1.0);
        return (0.55 - v * 0.45, -0.35 - v * 0.3);
    }
    let amp = 0.22 + spd.min(1.0) * 0.72;
    let s = run.sin();
    (s * amp, -s * amp)
}

// ---------------------------------------------------------------------------
// Will
// ---------------------------------------------------------------------------

pub const WILL_SCALE: f32 = 1.46;

// Skeleton, in authoring units with the feet at 0. Every joint is derived from
// the sprite heights so the limbs actually meet.
const W_KNEE: f32 = -60.0;      // shin (64 tall) hangs from here to the floor
const W_HIP: f32 = -126.0;      // thigh (66 tall) hangs from here to the knee
const W_TORSO_C: f32 = -182.0;  // torso (112 tall) spans -238..-126
const W_SHOULDER: f32 = -224.0;
const W_HEAD_C: f32 = -276.0;   // overlaps the collar so there is no gap
const W_UPPER_ARM: f32 = 56.0;
const W_FOREARM: f32 = 48.0;

pub fn draw_will(dl: &mut DrawList, n: &Npc, t: f32) {
    let chasing = n.state == NpcState::Chase;
    let moving = n.vel.x.abs() > 8.0;
    let phase = n.anim * if chasing { 10.0 } else { 6.2 };
    let swing = if moving { phase.sin() } else { (t * 1.4).sin() * 0.10 };
    let bob = if moving { (phase * 2.0).sin().abs() * 6.0 } else { (t * 1.3).sin() * 2.0 };

    let mut rig = Rig::new(n.pos, n.facing, WILL_SCALE);
    rig.tilt = if chasing { 0.09 * n.facing } else { 0.0 };

    // Walking lifts the whole upper body a little; the legs stay on the floor.
    let hip_y = W_HIP - bob * 0.5;
    let torso_y = W_TORSO_C - bob;
    let shoulder_y = W_SHOULDER - bob;
    let head_y = W_HEAD_C - bob;

    // ---- a leg: thigh from the hip, shin from wherever the knee ends up ----
    let leg = |rig: &Rig, dl: &mut DrawList, x: f32, a: f32, lay: i32| {
        rig.limb(dl, S_WILL_LEG, x, hip_y, 1.0, a, lay);
        let knee_x = x + a.sin() * (W_KNEE - W_HIP);
        let knee_y = hip_y + a.cos() * (W_KNEE - W_HIP);
        rig.limb(dl, S_WILL_SHIN, knee_x, knee_y, 1.0, a * 0.35 + 0.06, lay);
    };

    // ---- far side ----------------------------------------------------------
    rig.shade = 0.74;
    leg(&rig, dl, -10.0, -swing * 0.5, layer::ACTOR_BACK);
    rig.limb(dl, S_WILL_ARM, -16.0, shoulder_y, 1.0, swing * 0.6, layer::ACTOR_BACK);
    rig.shade = 1.0;

    // ---- torso and head ----------------------------------------------------
    rig.part(dl, S_WILL_TORSO, 0.0, torso_y, 1.0, p_lean(chasing, n.facing), layer::ACTOR);
    // A short neck, so the head reads as attached rather than hovering.
    rig.shade = 0.88;
    rig.part(dl, S_WILL_FOREARM, 6.0, shoulder_y - 16.0, 0.62, 0.0, layer::ACTOR);
    rig.shade = 1.0;

    let head_sprite = if chasing || n.suspicion > 0.6 {
        S_WILL_HEAD_MAD
    } else {
        S_WILL_HEAD
    };
    let look = n.look * 0.35 + if chasing { 0.08 } else { 0.0 };
    rig.part(dl, head_sprite, 8.0, head_y, 1.0, look, layer::ACTOR_FRONT);

    // ---- near side ---------------------------------------------------------
    leg(&rig, dl, 12.0, swing * 0.55, layer::ACTOR_FRONT);

    // Arm holding the tongs: swings when walking, raised when chasing.
    let arm_a = if chasing {
        -1.0 + (phase * 1.3).sin() * 0.3
    } else {
        -swing * 0.6
    };
    rig.limb(dl, S_WILL_ARM, 18.0, shoulder_y, 1.0, arm_a, layer::ACTOR_FRONT);
    let elbow_x = 18.0 + arm_a.sin() * W_UPPER_ARM;
    let elbow_y = shoulder_y + arm_a.cos() * W_UPPER_ARM;
    let fore_a = arm_a + if chasing { 0.65 } else { 0.22 };
    rig.limb(dl, S_WILL_FOREARM, elbow_x, elbow_y, 1.0, fore_a, layer::ACTOR_FRONT);

    // The grip sits a little short of the forearm's end, which is where the
    // hand is drawn; the tongs hang from there.
    let hand_x = elbow_x + fore_a.sin() * (W_FOREARM - 6.0);
    let hand_y = elbow_y + fore_a.cos() * (W_FOREARM - 6.0);
    // Tongs point along the forearm, gripped at their handle end.
    rig.spur(
        dl,
        S_WILL_TONGS,
        hand_x,
        hand_y,
        0.85,
        fore_a + PI * 0.5,
        layer::ACTOR_FRONT,
    );
}

fn p_lean(chasing: bool, facing: f32) -> f32 {
    if chasing {
        0.12 * facing
    } else {
        0.0
    }
}

// ---------------------------------------------------------------------------
// Popcorn
// ---------------------------------------------------------------------------

pub const POP_SCALE: f32 = 1.25;

// Joints, in authoring units with the paws at 0. Derived from the sprite
// geometry in web/art/30_popcorn.js so nothing floats or detaches.
const P_SHOULDER_X: f32 = 36.0;
const P_SHOULDER_Y: f32 = -89.0;   // foreleg is 92 tall, paw at 89
const P_HIP_X: f32 = -53.0;
const P_HIP_Y: f32 = -91.0;        // hind leg is 96 tall, paw at 91
const P_BODY_Y: f32 = -131.0;      // puts the belly on the leg joints
const P_HEAD_X: f32 = 137.0;
const P_HEAD_Y: f32 = -177.0;
const P_EAR_X: f32 = 106.0;
const P_EAR_Y: f32 = -201.0;
const P_TAIL_X: f32 = -74.0;
const P_TAIL_Y: f32 = -153.0;

pub fn draw_popcorn(dl: &mut DrawList, n: &Npc, t: f32) {
    let chasing = n.state == NpcState::Chase;
    let asleep = n.state == NpcState::Distracted;
    let moving = n.vel.x.abs() > 8.0;
    let phase = n.anim * if chasing { 12.0 } else { 6.8 };
    let swing = if moving { phase.sin() } else { 0.0 };
    let bounce = if moving { (phase * 2.0).sin().abs() * 7.0 } else { (t * 1.5).sin() * 1.6 };

    let mut rig = Rig::new(n.pos, n.facing, POP_SCALE);
    if chasing {
        rig.tilt = -0.045 * n.facing;
    }

    // Lying down: the whole dog settles and the legs fold under her.
    let settle = if asleep { 56.0 } else { 0.0 };
    let leg_s = if asleep { 0.38 } else { 1.0 };

    let body_y = P_BODY_Y + settle - bounce * 0.35;
    let hip_y = P_HIP_Y + settle;
    let sh_y = P_SHOULDER_Y + settle;
    let head_y = P_HEAD_Y + settle + if asleep { 54.0 } else { 0.0 };

    // ---- tail -----------------------------------------------------------
    let wag = if asleep {
        (t * 1.2).sin() * 0.08
    } else if chasing {
        (t * 16.0).sin() * 0.45
    } else {
        (t * 5.5).sin() * 0.26
    };
    let tw = sprite_w(S_POP_TAIL) * POP_SCALE;
    let ta = -0.2 + wag;
    let joint = rig.pt(P_TAIL_X, P_TAIL_Y + settle);
    // The sprite runs root-to-tip left-to-right, so aim it backwards and mirror.
    let dir = v2(-n.facing, 0.0).rot(ta * n.facing + rig.tilt);
    let tc = joint.add(dir.scale(tw * 0.5));
    dl.push(
        Sp::new(S_POP_TAIL, tc.x, tc.y)
            .scale(POP_SCALE)
            .rot(ta * n.facing + rig.tilt)
            .flip_x(n.facing > 0.0)
            .layer(layer::ACTOR_BACK),
    );

    // ---- far-side legs ---------------------------------------------------
    rig.shade = 0.76;
    rig.limb(dl, S_POP_LEG_BACK, P_HIP_X + 10.0, hip_y, leg_s, -swing * 0.55, layer::ACTOR_BACK);
    rig.limb(dl, S_POP_LEG_FRONT, P_SHOULDER_X - 10.0, sh_y, leg_s, swing * 0.62, layer::ACTOR_BACK);
    rig.shade = 1.0;

    // ---- body (the neck is part of this sprite) --------------------------
    rig.part(dl, S_POP_BODY, 0.0, body_y, 1.0, 0.0, layer::ACTOR);

    // ---- head ------------------------------------------------------------
    // Only ever a gentle nod: sniffing low, or level when she is hunting.
    let head_a = if asleep {
        0.24
    } else if chasing {
        -0.05 + (phase * 0.5).sin() * 0.04
    } else {
        0.10 + (t * 2.0).sin() * 0.05
    };

    // Far ear, tucked behind the skull.
    rig.shade = 0.78;
    rig.limb(dl, S_POP_EAR, P_EAR_X - 26.0, P_EAR_Y + settle, 0.88, head_a + 0.14, layer::ACTOR);
    rig.shade = 1.0;

    let hs = if n.bark > 0.0 { S_POP_HEAD_BARK } else { S_POP_HEAD };
    rig.part(dl, hs, P_HEAD_X, head_y, 1.0, head_a, layer::ACTOR_FRONT);

    // Near ear, swinging a little as she runs.
    let ear_a = head_a + 0.08
        + if moving { (phase).sin() * 0.18 } else { (t * 2.2).sin() * 0.05 };
    rig.limb(dl, S_POP_EAR, P_EAR_X, P_EAR_Y + settle, 1.0, ear_a, layer::ACTOR_FRONT);

    // ---- harness over the withers ----------------------------------------
    rig.part(dl, S_POP_HARNESS, 42.0, body_y - 12.0, 1.0, 0.0, layer::ACTOR_FRONT);

    // ---- near-side legs ---------------------------------------------------
    rig.limb(dl, S_POP_LEG_BACK, P_HIP_X - 8.0, hip_y, leg_s, swing * 0.6, layer::ACTOR_FRONT);
    rig.limb(dl, S_POP_LEG_FRONT, P_SHOULDER_X + 8.0, sh_y, leg_s, -swing * 0.68, layer::ACTOR_FRONT);

    if asleep {
        let f = ((t * 0.7) % 1.0).max(0.0);
        rig.part(dl, S_FX_ZZZ, P_HEAD_X + 30.0, head_y - 78.0 - f * 50.0, 0.7 + f * 0.3, 0.0, layer::FX);
    }
}
