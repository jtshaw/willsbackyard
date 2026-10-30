#![allow(dead_code)]

use crate::draw::{layer, DrawList, Sp, BLEND_ADD};
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

    // ---- the tutu, gathered over the hindquarters ------------------------
    // Drawn after the body but before the near legs, so the hind legs come
    // out from under the skirt rather than through it. Tulle is light, so it
    // lags the body a little when she moves.
    let skirt = if moving { (phase - 0.6).sin() * 0.07 } else { (t * 2.4).sin() * 0.03 };
    rig.part(dl, S_POP_TUTU, -44.0, body_y + 10.0, 0.80, skirt, layer::ACTOR_FRONT);

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

// ---------------------------------------------------------------------------
// Raccoons
// ---------------------------------------------------------------------------

pub const RAC_SCALE: f32 = 1.12;

// Joints in authoring units, feet at 0. The body is a boulder, so the legs
// attach well inside its silhouette and the head hangs off the front, low.
const R_SHOULDER_X: f32 = 58.0;
const R_SHOULDER_Y: f32 = -92.0;   // foreleg is 96 tall, hand at ~92
const R_HIP_X: f32 = -52.0;
const R_HIP_Y: f32 = -98.0;        // hind leg is 102 tall, foot at ~98
const R_BODY_Y: f32 = -150.0;
const R_HEAD_X: f32 = 112.0;
const R_HEAD_Y: f32 = -112.0;      // carried LOW -- that is the whole posture
const R_TAIL_X: f32 = -84.0;
const R_TAIL_Y: f32 = -140.0;

pub fn draw_raccoon(dl: &mut DrawList, n: &Npc, t: f32) {
    let hiding = n.state == NpcState::Hiding;
    let peeking = n.state == NpcState::Suspicious;
    let chasing = n.state == NpcState::Chase;
    let fleeing = n.state == NpcState::Flee;
    let moving = n.vel.x.abs() > 8.0;

    // Hidden raccoons are drawn only as eyeshine; the heat blob that gives
    // them away in thermal is added by the scene layer.
    if hiding {
        let eye = v2(n.pos.x + 22.0 * n.facing, n.pos.y - 120.0);
        let blink = ((t * 0.7 + n.home.x * 0.01).sin() * 0.5 + 0.5).powf(6.0);
        dl.push(
            Sp::new(S_RAC_EYESHINE, eye.x, eye.y)
                .width(74.0)
                .flip_x(n.facing < 0.0)
                .alpha(0.30 + blink * 0.5)
                .blend(BLEND_ADD)
                .layer(layer::FX),
        );
        return;
    }

    let phase = n.anim * if chasing || fleeing { 15.0 } else { 7.0 };
    let swing = if moving { phase.sin() } else { 0.0 };
    // The boulder rocks rather than bounces.
    let roll = if moving { (phase * 2.0).sin() * 5.0 } else { (t * 1.6).sin() * 1.4 };

    let mut rig = Rig::new(n.pos, n.facing, RAC_SCALE);
    rig.tilt = if chasing { 0.07 * n.facing } else { 0.0 };

    // Breaking cover: it comes up out of the obstacle.
    let emerge = if peeking {
        1.0 - clamp(n.state_t / 0.45, 0.0, 1.0)
    } else {
        0.0
    };
    let sink = emerge * 90.0;

    let body_y = R_BODY_Y + sink - roll * 0.3;
    let hip_y = R_HIP_Y + sink;
    let sh_y = R_SHOULDER_Y + sink;
    let head_y = R_HEAD_Y + sink + if chasing { -8.0 } else { 0.0 };

    // ---- tail: a low stub behind the mass -------------------------------
    let tw = sprite_w(S_RAC_TAIL) * RAC_SCALE;
    let ta = 0.42 + (t * 6.0).sin() * 0.08;
    let joint = rig.pt(R_TAIL_X, R_TAIL_Y + sink);
    let dir = v2(-n.facing, 0.0).rot(ta * n.facing + rig.tilt);
    let tc = joint.add(dir.scale(tw * 0.5));
    dl.push(
        Sp::new(S_RAC_TAIL, tc.x, tc.y)
            .scale(RAC_SCALE)
            .rot(ta * n.facing + rig.tilt)
            .flip_x(n.facing > 0.0)
            .layer(layer::ACTOR_BACK),
    );

    // ---- far legs --------------------------------------------------------
    rig.shade = 0.72;
    rig.limb(dl, S_RAC_LEG_BACK, R_HIP_X + 12.0, hip_y, 1.0, -swing * 0.6, layer::ACTOR_BACK);
    rig.limb(dl, S_RAC_LEG_FRONT, R_SHOULDER_X - 12.0, sh_y, 1.0, swing * 0.68, layer::ACTOR_BACK);
    rig.shade = 1.0;

    // ---- the boulder -----------------------------------------------------
    rig.part(dl, S_RAC_BODY, 0.0, body_y, 1.0, roll * 0.004, layer::ACTOR);

    // ---- head, slung low and forward -------------------------------------
    let head_a = if chasing {
        0.30 + (phase * 0.5).sin() * 0.05
    } else if fleeing {
        0.18
    } else {
        0.34 + (t * 2.0).sin() * 0.05
    };
    let hs = if chasing { S_RAC_HEAD_SNARL } else { S_RAC_HEAD };
    rig.part(dl, hs, R_HEAD_X, head_y, 1.0, head_a, layer::ACTOR_FRONT);

    // ---- near legs -------------------------------------------------------
    rig.limb(dl, S_RAC_LEG_BACK, R_HIP_X - 10.0, hip_y, 1.0, swing * 0.64, layer::ACTOR_FRONT);
    rig.limb(dl, S_RAC_LEG_FRONT, R_SHOULDER_X + 10.0, sh_y, 1.0, -swing * 0.72, layer::ACTOR_FRONT);

    // Carrying off somebody else's dinner.
    if n.carrying {
        rig.part(dl, S_FOOD_HOTDOG, R_HEAD_X - 20.0, head_y + 34.0, 0.6,
                 (t * 9.0).sin() * 0.2, layer::ACTOR_FRONT);
    }
}

// ---------------------------------------------------------------------------
// Party guests -- Will's skeleton in somebody else's terrible costume
// ---------------------------------------------------------------------------

/// Every costume is authored at Will's part sizes, so his joints fit it.
struct Outfit {
    head: u16,
    torso: u16,
    arm: u16,
    forearm: u16,
    leg: u16,
    shin: u16,
    prop: u16,
    prop_s: f32,
}

fn outfit(costume: u8) -> Outfit {
    match costume {
        COSTUME_DOCTOR => Outfit {
            head: S_GUEST_DOCTOR_HEAD,
            torso: S_GUEST_DOCTOR_TORSO,
            arm: S_GUEST_DOCTOR_ARM,
            forearm: S_GUEST_DOCTOR_FOREARM,
            leg: S_GUEST_DOCTOR_LEG,
            shin: S_GUEST_DOCTOR_SHIN,
            prop: S_GUEST_SYRINGE,
            prop_s: 0.9,
        },
        COSTUME_PILOT => Outfit {
            head: S_GUEST_PILOT_HEAD,
            torso: S_GUEST_PILOT_TORSO,
            arm: S_GUEST_PILOT_ARM,
            forearm: S_GUEST_PILOT_FOREARM,
            leg: S_GUEST_PILOT_LEG,
            shin: S_GUEST_PILOT_SHIN,
            prop: S_BOTTLE,
            prop_s: 0.42,
        },
        COSTUME_TOGA => Outfit {
            head: S_GUEST_TOGA_HEAD,
            torso: S_GUEST_TOGA_TORSO,
            arm: S_GUEST_TOGA_ARM,
            forearm: S_GUEST_TOGA_FOREARM,
            leg: S_GUEST_TOGA_LEG,
            shin: S_GUEST_TOGA_SHIN,
            prop: S_GUEST_CUP,
            prop_s: 0.9,
        },
        _ => Outfit {
            head: S_GUEST_CRYPTO_HEAD,
            torso: S_GUEST_CRYPTO_TORSO,
            arm: S_GUEST_CRYPTO_ARM,
            forearm: S_GUEST_CRYPTO_FOREARM,
            leg: S_GUEST_CRYPTO_LEG,
            shin: S_GUEST_CRYPTO_SHIN,
            prop: S_GUEST_PHONE,
            prop_s: 0.85,
        },
    }
}

impl Rig {
    /// Like `limb`, but free to swing overhead -- arms in the air on the drop.
    pub fn reach(&self, dl: &mut DrawList, sprite: u16, jx: f32, jy: f32, s: f32, angle: f32, lay: i32) {
        let h = sprite_h(sprite) * s * self.scale;
        let a = self.ang(angle);
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
}

/// An arm from the shoulder: upper arm, forearm, and the prop in the hand.
/// Returns the hand position in rig-local units.
fn guest_arm(rig: &Rig, dl: &mut DrawList, o: &Outfit, x: f32, shoulder_y: f32, arm_a: f32, fore_a: f32, lay: i32) -> V2 {
    rig.reach(dl, o.arm, x, shoulder_y, 1.0, arm_a, lay);
    let ex = x + arm_a.sin() * W_UPPER_ARM;
    let ey = shoulder_y + arm_a.cos() * W_UPPER_ARM;
    rig.reach(dl, o.forearm, ex, ey, 1.0, fore_a, lay);
    v2(ex + fore_a.sin() * (W_FOREARM - 6.0), ey + fore_a.cos() * (W_FOREARM - 6.0))
}

pub fn draw_guest(dl: &mut DrawList, n: &Npc, t: f32, dancing: bool, beat: f32) {
    let o = outfit(n.costume);
    let chasing = n.state == NpcState::Chase;
    let dance = dancing && n.state == NpcState::Distracted;
    let chatting = !dance && n.state == NpcState::Distracted;
    let moving = n.vel.x.abs() > 8.0;
    // Everyone is a little off the beat, which is the point of a party.
    let off = n.home.x * 0.0021;
    let phase = n.anim * if chasing { 10.0 } else { 6.6 };

    let (swing, bob) = if dance {
        let b = (beat * PI + off).sin();
        (b * 0.35, b.abs() * 16.0)
    } else if moving {
        (phase.sin(), (phase * 2.0).sin().abs() * 6.0)
    } else {
        ((t * 1.4 + off).sin() * 0.08, (t * 1.3 + off).sin() * 2.0)
    };

    let mut rig = Rig::new(n.pos, n.facing, WILL_SCALE);
    rig.tilt = if chasing {
        0.09 * n.facing
    } else if dance {
        (beat * PI * 0.5 + off).sin() * 0.07
    } else {
        0.0
    };

    let hip_y = W_HIP - bob * 0.5;
    let torso_y = W_TORSO_C - bob;
    let shoulder_y = W_SHOULDER - bob;
    let head_y = W_HEAD_C - bob;

    let leg = |rig: &Rig, dl: &mut DrawList, x: f32, a: f32, lay: i32| {
        rig.limb(dl, o.leg, x, hip_y, 1.0, a, lay);
        let knee_x = x + a.sin() * (W_KNEE - W_HIP);
        let knee_y = hip_y + a.cos() * (W_KNEE - W_HIP);
        rig.limb(dl, o.shin, knee_x, knee_y, 1.0, a * 0.35 + 0.06, lay);
    };

    // ---- far side ----------------------------------------------------------
    rig.shade = 0.74;
    leg(&rig, dl, -10.0, -swing * 0.5, layer::ACTOR_BACK);
    if dance {
        // Hands up for the drop, waving out of time with the other one.
        let a = PI - 0.45 + (beat * PI + off + 1.3).sin() * 0.3;
        guest_arm(&rig, dl, &o, -16.0, shoulder_y, a, a + 0.25, layer::ACTOR_BACK);
    } else {
        guest_arm(&rig, dl, &o, -16.0, shoulder_y, swing * 0.6, swing * 0.6 + 0.2, layer::ACTOR_BACK);
    }
    rig.shade = 1.0;

    // ---- torso and head ----------------------------------------------------
    rig.part(dl, o.torso, 0.0, torso_y, 1.0, p_lean(chasing, n.facing), layer::ACTOR);
    let look = if dance {
        (beat * PI + off).sin() * 0.16
    } else {
        n.look * 0.35 + if chasing { 0.08 } else { 0.0 }
    };
    rig.part(dl, o.head, 8.0, head_y, 1.0, look, layer::ACTOR_FRONT);
    // Spotted you: the same face, now shrieking.
    if chasing || n.suspicion > 0.6 {
        rig.part(dl, S_GUEST_SHOUT, 11.0, head_y + 26.0, 1.0, look, layer::ACTOR_FRONT + 1);
    }

    // ---- near side ---------------------------------------------------------
    leg(&rig, dl, 12.0, swing * 0.55, layer::ACTOR_FRONT);
    let (arm_a, fore_a) = if chasing {
        // Pointing at the rat.
        (-1.35 + (phase * 1.3).sin() * 0.1, -1.5)
    } else if dance {
        let a = PI - 0.35 + (beat * PI + off).sin() * 0.35;
        (a, a - 0.2)
    } else if chatting {
        // Drink (or phone) up at face height.
        (-0.35, -2.5)
    } else {
        (-swing * 0.6, -swing * 0.6 - 0.3)
    };
    let hand = guest_arm(&rig, dl, &o, 18.0, shoulder_y, arm_a, fore_a, layer::ACTOR_FRONT);
    rig.part(dl, o.prop, hand.x + 4.0, hand.y - 6.0, o.prop_s, if dance { -0.4 } else { 0.0 }, layer::ACTOR_FRONT + 1);
}

/// DJ Benny Blu3, behind the decks: nodding on every beat, one hand on the
/// mixer, and both in the air when it drops.
pub fn draw_dj(dl: &mut DrawList, n: &Npc, beat: f32, drop: bool) {
    let b = (beat * PI).sin();
    let bob = b.abs() * if drop { 14.0 } else { 6.0 };
    let rig = Rig::new(n.pos, n.facing, WILL_SCALE);
    let shoulder_y = W_SHOULDER - bob;

    let mut back = Rig::new(n.pos, n.facing, WILL_SCALE);
    back.shade = 0.74;
    if drop {
        let a = PI - 0.3 + (beat * PI * 0.5).sin() * 0.25;
        back.reach(dl, S_DJ_ARM, -16.0, shoulder_y, 1.0, a, layer::ACTOR_BACK);
        let ex = -16.0 + a.sin() * W_UPPER_ARM;
        let ey = shoulder_y + a.cos() * W_UPPER_ARM;
        back.reach(dl, S_DJ_FOREARM, ex, ey, 1.0, a + 0.2, layer::ACTOR_BACK);
    } else {
        // Holding one ear of the headphones to the head.
        back.reach(dl, S_DJ_ARM, -16.0, shoulder_y, 1.0, -0.6, layer::ACTOR_BACK);
        let ex = -16.0 + (-0.6f32).sin() * W_UPPER_ARM;
        let ey = shoulder_y + (-0.6f32).cos() * W_UPPER_ARM;
        back.reach(dl, S_DJ_FOREARM, ex, ey, 1.0, PI - 0.2, layer::ACTOR_BACK);
    }

    rig.part(dl, S_DJ_TORSO, 0.0, W_TORSO_C - bob, 1.0, 0.0, layer::ACTOR);
    rig.part(dl, S_DJ_HEAD, 8.0, W_HEAD_C - bob, 1.0, b * 0.08 + 0.1, layer::ACTOR_FRONT);

    // Near hand works the mixer; on the drop it punches the air instead.
    let (a, f) = if drop {
        let a = PI - 0.5 + (beat * PI).sin() * 0.3;
        (a, a - 0.15)
    } else {
        (0.55 + b * 0.08, 1.35 + b * 0.12)
    };
    rig.reach(dl, S_DJ_ARM, 18.0, shoulder_y, 1.0, a, layer::ACTOR_FRONT);
    let ex = 18.0 + a.sin() * W_UPPER_ARM;
    let ey = shoulder_y + a.cos() * W_UPPER_ARM;
    rig.reach(dl, S_DJ_FOREARM, ex, ey, 1.0, f, layer::ACTOR_FRONT);
}
