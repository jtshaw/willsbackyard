#![allow(dead_code)]

use crate::level::*;
use crate::math::*;
use crate::player::{Player, PlayerState};

/// How fast suspicion fills when the rat is dead centre in a vision cone.
const SPOT_RATE: f32 = 1.75;
/// Flashlights are far less forgiving.
const LIGHT_RATE: f32 = 3.4;
const CALM_RATE: f32 = 0.55;
/// Suspicion at which the NPC commits to a chase.
const ALERT: f32 = 1.0;

pub struct NpcResult {
    pub caught: bool,
    /// An NPC went from calm to chasing this frame -- worth a sting and a shout.
    pub new_alert: bool,
    /// Highest suspicion across all NPCs, for the HUD meter.
    pub tension: f32,
    pub bark: bool,
}

/// Is the rat tucked into cover right now?
pub fn in_cover(lvl: &Level, p: &Player) -> bool {
    let b = p.body();
    lvl.covers
        .iter()
        .any(|c| c.r.overlaps(&b) && (!c.needs_crouch || p.crouch))
}

/// Direction an NPC is currently looking, in radians.
fn look_dir(n: &Npc) -> V2 {
    match n.kind {
        NpcKind::WillLight => v2(n.look.cos() * n.facing, n.look.sin().abs()),
        _ => v2(n.facing, n.look * 0.35),
    }
    .norm()
}

/// 0..1 -- how plainly the rat is visible to this NPC.
pub fn visibility(n: &Npc, lvl: &Level, p: &Player, hidden: bool) -> f32 {
    if hidden || p.state == PlayerState::Caught || p.state == PlayerState::Safe {
        return 0.0;
    }
    let eye = n.eye();
    let target = p.center();
    let to = target.sub(eye);
    let dist = to.len();
    if dist > n.cone_range || dist < 1.0 {
        return 0.0;
    }

    // Will is tall: he simply cannot see under his own deck.
    if n.kind != NpcKind::WillLight && n.kind != NpcKind::Popcorn {
        if target.y > n.pos.y + 60.0 {
            return 0.0;
        }
    }

    let dir = look_dir(n);
    let cos_a = to.norm().dot(dir);
    let cone_cos = n.cone_half.cos();
    if cos_a < cone_cos {
        return 0.0;
    }

    // Anything solid between the two kills the sighting.
    for b in lvl.blockers.iter() {
        if seg_hits_rect(eye, target, b) {
            return 0.0;
        }
    }

    // Brightest dead ahead and close in; crouching shrinks the silhouette.
    let edge = ((cos_a - cone_cos) / (1.0 - cone_cos + 1e-4)).min(1.0);
    let near = 1.0 - (dist / n.cone_range).powf(1.4);
    let crouch = if p.crouch { 0.55 } else { 1.0 };
    (edge.sqrt() * near * crouch).max(0.0)
}

/// Noise reaches around corners -- this is how the dozing dog wakes up.
fn audibility(n: &Npc, p: &Player) -> f32 {
    let d = n.pos.dist(p.pos);
    let range = match n.kind {
        NpcKind::Popcorn => 1200.0,
        _ => 760.0,
    };
    if d > range {
        return 0.0;
    }
    p.noise * (1.0 - d / range)
}

pub fn update(lvl: &mut Level, p: &mut Player, dt: f32, t: f32) -> NpcResult {
    let hidden = in_cover(lvl, p);
    let mut res = NpcResult {
        caught: false,
        new_alert: false,
        tension: 0.0,
        bark: false,
    };

    // Levels carry their own blockers; copy what we need so the borrow checker
    // stays happy while we mutate the npc list.
    let player_pos = p.pos;
    let player_center = p.center();

    for i in 0..lvl.npcs.len() {
        let (vis, aud) = {
            let n = &lvl.npcs[i];
            (visibility(n, lvl, p, hidden), audibility(n, p))
        };
        let n = &mut lvl.npcs[i];
        n.state_t += dt;
        n.anim += dt;
        n.bark = (n.bark - dt).max(0.0);

        let was_chasing = n.state == NpcState::Chase;

        // ---- look direction ------------------------------------------------
        match n.kind {
            NpcKind::WillLight => {
                // A slow searchlight sweep across the dirt below.
                let sweep = (t * 0.55 + n.state_t).sin();
                n.look = 1.18 + sweep * 0.42;
                if n.state == NpcState::Chase {
                    // Locked on: the beam tracks the rat.
                    let to = player_center.sub(n.eye());
                    n.facing = sign(to.x);
                    n.look = (to.y.abs() / to.x.abs().max(1.0)).atan().max(0.4);
                }
            }
            NpcKind::WillBusy => {
                // Head down at the pumpkins, then a glance up.
                let cycle = (t * 0.42 + n.home.x * 0.001) % 1.0;
                if cycle < 0.58 {
                    n.state = NpcState::Distracted;
                } else if n.state != NpcState::Chase {
                    n.state = NpcState::Pause;
                }
                n.look = (t * 1.1).sin() * 0.12;
            }
            _ => {
                n.look = (t * 1.6 + n.home.x * 0.002).sin() * 0.16;
            }
        }

        // ---- suspicion -----------------------------------------------------
        let distracted = n.state == NpcState::Distracted;
        let rate = if n.kind == NpcKind::WillLight {
            LIGHT_RATE
        } else {
            SPOT_RATE
        };
        let gain = if distracted { 0.0 } else { vis * rate } + aud * 0.9;
        if gain > 0.0 {
            n.suspicion = (n.suspicion + gain * dt).min(1.6);
        } else {
            n.suspicion = (n.suspicion - CALM_RATE * dt).max(0.0);
        }

        if n.suspicion >= ALERT && n.state != NpcState::Chase {
            n.state = NpcState::Chase;
            n.state_t = 0.0;
            n.bark = 0.9;
            res.new_alert = true;
            if n.kind == NpcKind::Popcorn {
                res.bark = true;
            }
        } else if n.suspicion > 0.35 && n.suspicion < ALERT && n.state == NpcState::Patrol {
            n.state = NpcState::Suspicious;
            n.state_t = 0.0;
        }

        res.tension = res.tension.max(n.suspicion / ALERT);

        // ---- movement ------------------------------------------------------
        let can_move = !matches!(n.kind, NpcKind::WillBusy | NpcKind::WillLight);
        match n.state {
            NpcState::Chase => {
                if can_move {
                    let chase_speed = n.speed * if n.kind == NpcKind::Popcorn { 1.55 } else { 1.35 };
                    let dir = sign(player_pos.x - n.pos.x);
                    // Stay inside the patrol run, extended generously while hunting.
                    let lo = n.from - 900.0;
                    let hi = n.to + 900.0;
                    let next = n.pos.x + dir * chase_speed * dt;
                    n.pos.x = clamp(next, lo, hi);
                    if dir != 0.0 {
                        n.facing = dir;
                    }
                    n.vel.x = dir * chase_speed;
                }
                // Give up once the trail has gone cold.
                if vis <= 0.0 && aud <= 0.02 {
                    n.suspicion -= CALM_RATE * 0.7 * dt;
                    if n.suspicion < 0.45 {
                        n.state = NpcState::Return;
                        n.state_t = 0.0;
                    }
                }
            }
            NpcState::Suspicious => {
                n.vel.x = 0.0;
                if n.state_t > 1.6 {
                    n.state = if can_move { NpcState::Patrol } else { NpcState::Pause };
                }
            }
            NpcState::Return => {
                if can_move {
                    let dir = sign(n.home.x - n.pos.x);
                    n.pos.x += dir * n.speed * 0.7 * dt;
                    n.facing = dir;
                    n.vel.x = dir * n.speed * 0.7;
                    if (n.pos.x - n.home.x).abs() < 40.0 {
                        n.state = NpcState::Patrol;
                    }
                }
            }
            NpcState::Patrol => {
                n.pos.x += n.facing * n.speed * dt;
                n.vel.x = n.facing * n.speed;
                if n.pos.x > n.to {
                    n.pos.x = n.to;
                    n.facing = -1.0;
                    n.state = NpcState::Pause;
                    n.state_t = 0.0;
                } else if n.pos.x < n.from {
                    n.pos.x = n.from;
                    n.facing = 1.0;
                    n.state = NpcState::Pause;
                    n.state_t = 0.0;
                }
            }
            NpcState::Pause => {
                n.vel.x = 0.0;
                if can_move && n.state_t > 1.1 {
                    n.state = NpcState::Patrol;
                }
            }
            NpcState::Distracted => {
                n.vel.x = 0.0;
                if can_move && n.state_t > 3.0 {
                    n.state = NpcState::Patrol;
                    n.state_t = 0.0;
                }
            }
        }

        if n.kind == NpcKind::Popcorn && n.state == NpcState::Chase && n.bark <= 0.0 {
            n.bark = 0.55;
            res.bark = true;
        }

        // ---- the grab -------------------------------------------------------
        let reach = match n.kind {
            NpcKind::Popcorn => 120.0,
            NpcKind::WillLight => 0.0,
            _ => 150.0,
        };
        if reach > 0.0 && n.state == NpcState::Chase {
            let dx = (n.pos.x - player_pos.x).abs();
            let dy = (n.pos.y - player_pos.y).abs();
            if dx < reach && dy < 320.0 {
                res.caught = true;
            }
        }
        // A flashlight does not grab you -- holding you in the beam does.
        if n.kind == NpcKind::WillLight && n.suspicion >= 1.45 {
            res.caught = true;
        }

        let _ = was_chasing;
    }

    res
}
