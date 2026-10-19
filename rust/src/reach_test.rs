//! Level geometry validation.
//!
//! A platform you cannot jump onto, or loot you cannot reach, silently breaks
//! a level -- the hedge never opens and the player has no idea why. These
//! tests walk every level and assert that each surface and each pickup is
//! actually reachable with the rat's real jump arc.

use crate::level::*;
use crate::levels;
use crate::math::*;
use crate::player::{BODY_H, BODY_W, GRAVITY, JUMP_VEL};

/// Peak height of a full-hold jump, from the physics constants themselves.
fn jump_height() -> f32 {
    (JUMP_VEL * JUMP_VEL) / (2.0 * GRAVITY)
}

/// Horizontal distance covered over a full jump arc at run speed.
fn jump_reach() -> f32 {
    let airtime = 2.0 * (-JUMP_VEL) / GRAVITY;
    crate::player::RUN_SPEED * airtime
}

/// A surface the rat can stand on: (x0, x1, top_y).
fn standable(lvl: &Level) -> Vec<(f32, f32, f32)> {
    let mut out = Vec::new();
    for s in lvl.solids.iter() {
        if s.mover < 0 {
            out.push((s.r.x, s.r.right(), s.r.y));
        } else {
            // Moving platforms sweep a range; both extremes are standable.
            let m = &lvl.movers[s.mover as usize];
            let (a, b) = match m.kind {
                MoverKind::Swing => {
                    let amp = m.span.y;
                    let rope = m.span.x;
                    let drop = rope * (1.0 - amp.cos());
                    (v2(-amp.sin() * rope, 0.0), v2(amp.sin() * rope, drop))
                }
                _ => (
                    v2(-m.span.x, -m.span.y.abs()),
                    v2(m.span.x, m.span.y.abs()),
                ),
            };
            out.push((s.r.x + a.x, s.r.right() + a.x, s.r.y + a.y));
            out.push((s.r.x + b.x, s.r.right() + b.x, s.r.y + b.y));
            // It passes through the rest position every cycle too.
            out.push((s.r.x, s.r.right(), s.r.y));
        }
    }
    // Ladders and rope nets make their whole column reachable.
    for c in lvl.climbs.iter() {
        let steps = ((c.h / 90.0) as i32).max(1);
        for i in 0..=steps {
            let y = c.y + c.h * (i as f32 / steps as f32);
            out.push((c.x - 60.0, c.right() + 60.0, y));
        }
    }
    out
}

fn horizontal_gap(x0: f32, x1: f32, a: f32, b: f32) -> f32 {
    if x1 < a {
        a - x1
    } else if b < x0 {
        x0 - b
    } else {
        0.0
    }
}

#[test]
fn every_surface_is_reachable() {
    let rise_limit = jump_height() - 6.0; // a little margin for the player
    let span_limit = jump_reach() * 0.85;
    let mut problems = Vec::new();

    for li in 0..levels::LEVEL_COUNT {
        let lvl = levels::build(li);
        let surfaces = standable(&lvl);

        for s in lvl.solids.iter() {
            // Big ground slabs are the thing you jump *from*, and Hidden
            // solids are structure (ceilings, walls) you never stand on.
            if s.r.h > 600.0 || s.surface == Surface::Hidden {
                continue;
            }
            let (x0, x1, ty) = (s.r.x, s.r.right(), s.r.y);
            let mut best: Option<f32> = None;
            for &(a, b, t) in surfaces.iter() {
                if (t - ty).abs() < 1.0 && horizontal_gap(x0, x1, a, b) < 1.0 {
                    continue; // itself
                }
                if t < ty - 1.0 {
                    continue; // above us; cannot jump down from there to get up
                }
                let gap = horizontal_gap(x0, x1, a, b);
                if gap > span_limit {
                    continue;
                }
                let rise = t - ty;
                if best.map_or(true, |r| rise < r) {
                    best = Some(rise);
                }
            }
            match best {
                None => problems.push(format!(
                    "L{} surface x={:.0}..{:.0} y={:.0}: nothing below it",
                    li, x0, x1, ty
                )),
                Some(rise) if rise > rise_limit => problems.push(format!(
                    "L{} surface x={:.0}..{:.0} y={:.0}: needs a {:.0}px jump (max {:.0})",
                    li, x0, x1, ty, rise, rise_limit
                )),
                _ => {}
            }
        }
    }

    assert!(problems.is_empty(), "unreachable geometry:\n  {}", problems.join("\n  "));
}

#[test]
fn every_pickup_is_reachable() {
    // Highest point the rat's collection box reaches above a surface.
    let reach = jump_height() + BODY_H + 26.0;
    let mut problems = Vec::new();

    for li in 0..levels::LEVEL_COUNT {
        let lvl = levels::build(li);
        let surfaces = standable(&lvl);

        for pk in lvl.pickups.iter() {
            // Bait sits on its trap by construction.
            if pk.trap >= 0 {
                continue;
            }
            let mut best: Option<f32> = None;
            for &(a, b, t) in surfaces.iter() {
                if t < pk.pos.y - 1.0 {
                    continue;
                }
                // Must be standing more or less underneath it.
                if horizontal_gap(pk.pos.x - BODY_W * 0.5, pk.pos.x + BODY_W * 0.5, a, b) > 150.0 {
                    continue;
                }
                let d = t - pk.pos.y;
                if best.map_or(true, |r| d < r) {
                    best = Some(d);
                }
            }
            let loot = if pk.food.is_loot() { " [LOOT]" } else { "" };
            match best {
                None => problems.push(format!(
                    "L{} pickup {:?} at ({:.0},{:.0}){}: no surface under it",
                    li, pk.food as i32, pk.pos.x, pk.pos.y, loot
                )),
                Some(d) if d > reach => problems.push(format!(
                    "L{} pickup {:?} at ({:.0},{:.0}){}: {:.0}px above the nearest footing (max {:.0})",
                    li, pk.food as i32, pk.pos.x, pk.pos.y, loot, d, reach
                )),
                _ => {}
            }
        }
    }

    assert!(problems.is_empty(), "unreachable pickups:\n  {}", problems.join("\n  "));
}

/// The hedge only opens once you hold enough loot, so every level must carry
/// strictly more loot than it demands -- otherwise one bad grab wedges a run.
#[test]
fn every_level_has_enough_loot() {
    for li in 0..levels::LEVEL_COUNT {
        let lvl = levels::build(li);
        let available = lvl.pickups.iter().filter(|p| p.food.is_loot()).count() as i32;
        assert!(
            available >= lvl.loot_required,
            "L{} needs {} loot but only places {}",
            li,
            lvl.loot_required,
            available
        );
    }
}

#[test]
fn spawn_and_checkpoints_stand_on_something() {
    for li in 0..levels::LEVEL_COUNT {
        let lvl = levels::build(li);
        let surfaces = standable(&lvl);
        let mut pts = vec![("spawn", lvl.spawn)];
        for (i, c) in lvl.checkpoints.iter().enumerate() {
            pts.push((Box::leak(format!("checkpoint {}", i).into_boxed_str()), *c));
        }
        for (what, p) in pts {
            let grounded = surfaces.iter().any(|&(a, b, t)| {
                p.x >= a - 40.0 && p.x <= b + 40.0 && t >= p.y - 2.0 && t - p.y < 700.0
            });
            assert!(grounded, "L{} {} at ({:.0},{:.0}) has no floor", li, what, p.x, p.y);
        }
    }
}
