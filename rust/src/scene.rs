#![allow(dead_code)]

use crate::draw::*;
use crate::level::*;
use crate::math::*;
use crate::player::Player;
use crate::puppet;
use crate::sprites::*;

// ---------------------------------------------------------------------------
// Sky and weather
// ---------------------------------------------------------------------------

pub fn draw_sky(dl: &mut DrawList, lvl: &Level, t: f32) {
    dl.screen_space = true;
    dl.push(
        Sp::new(lvl.sky, dl.view_w * 0.5, dl.view_h * 0.5)
            .size(dl.view_w, dl.view_h * 1.02)
            .layer(layer::SKY),
    );
    dl.screen_space = false;

    // Drifting leaves, always falling somewhere in frame.
    if lvl.mood != Mood::Underside {
        let n = 26;
        for i in 0..n {
            let seed = i as i32;
            let sp = 0.4 + hash_f(seed, 0x51) * 0.9;
            let span = 2400.0;
            let fall = (t * 46.0 * sp + hash_f(seed, 0x77) * span) % span;
            let x = dl.cam_x + (hash_f(seed, 0x13) - 0.5) * dl.view_w * 1.6 + (t * 30.0 * sp) % 400.0;
            let y = dl.cam_y - dl.view_h * 0.6 + fall;
            let sway = (t * 2.0 + i as f32).sin() * 40.0;
            let tint = [
                (0.94, 0.68, 0.26),
                (0.82, 0.42, 0.16),
                (0.74, 0.26, 0.19),
                (0.96, 0.80, 0.28),
            ][i % 4];
            dl.push(
                Sp::new(S_LEAF, x + sway, y)
                    .width(26.0 + hash_f(seed, 0x9f) * 22.0)
                    .rot(t * (1.4 + sp) + i as f32)
                    .tint(tint.0, tint.1, tint.2)
                    .alpha(0.75)
                    .layer(layer::FX),
            );
        }
    }
}

// ---------------------------------------------------------------------------
// Static scenery
// ---------------------------------------------------------------------------

pub fn draw_decor(dl: &mut DrawList, lvl: &Level, t: f32) {
    let amb = lvl.ambient;
    for d in lvl.decor.iter() {
        dl.parallax = d.parallax;
        let sway = if d.sway > 0.0 {
            (t * 0.9 + d.pos.x * 0.004).sin() * d.sway
        } else {
            0.0
        };
        dl.push(
            Sp::new(d.sprite, d.pos.x, d.pos.y)
                .size(d.w, d.h)
                .rot(d.rot + sway)
                .tint(d.tint.0 * amb.0, d.tint.1 * amb.1, d.tint.2 * amb.2)
                .alpha(d.alpha)
                .flip_x(d.flip)
                .layer(d.layer),
        );
    }
    dl.parallax = 1.0;
}

/// Terrain is drawn straight from the collision solids, so the two can never
/// disagree about where the floor is.
pub fn draw_solids(dl: &mut DrawList, lvl: &Level) {
    let amb = lvl.ambient;
    for s in lvl.solids.iter() {
        if s.surface == Surface::Hidden {
            continue;
        }
        let r = lvl.solid_rect(s);

        // Thin platforms get a plank, not a tiled ground cap.
        if r.h <= 60.0 {
            let (sprite, tint) = match s.surface {
                Surface::Plastic => (S_BEAM_WOOD, (1.12, 0.92, 0.38)),
                Surface::Metal => (S_PIPE, (1.0, 1.0, 1.0)),
                Surface::Deck => (S_DECK_PLANK, (1.0, 1.0, 1.0)),
                _ => (S_BEAM_WOOD, (1.0, 1.0, 1.0)),
            };
            let n = (r.w / 400.0).ceil().max(1.0);
            let tw = r.w / n;
            for i in 0..n as i32 {
                dl.push(
                    Sp::new(sprite, r.x + tw * (i as f32 + 0.5), r.y + 16.0)
                        .size(tw + 2.0, 42.0)
                        .tint(tint.0 * amb.0, tint.1 * amb.1, tint.2 * amb.2)
                        .layer(layer::GROUND),
                );
            }
            continue;
        }

        let (cap, cap_h, fill) = match s.surface {
            Surface::Grass => (S_GROUND_GRASS, 170.0, (0.42, 0.32, 0.22)),
            Surface::Leaves => (S_GROUND_LEAVES, 170.0, (0.42, 0.32, 0.22)),
            Surface::Dirt => (S_GROUND_DIRT, 170.0, (0.34, 0.26, 0.19)),
            Surface::Deck => (S_DECK_PLANK, 58.0, (0.30, 0.20, 0.14)),
            Surface::Plastic => (S_BEAM_WOOD, 48.0, (0.70, 0.56, 0.16)),
            Surface::Metal => (S_PIPE, 56.0, (0.36, 0.40, 0.44)),
            _ => (S_BEAM_WOOD, 52.0, (0.36, 0.26, 0.16)),
        };

        // Body below the cap.
        if r.h > cap_h {
            dl.rect_fill(
                rect(r.x, r.y + cap_h - 4.0, r.w, r.h - cap_h + 4.0),
                (fill.0 * amb.0, fill.1 * amb.1, fill.2 * amb.2),
                1.0,
                layer::GROUND,
            );
        }

        let n = (r.w / 256.0).ceil().max(1.0);
        let tw = r.w / n;
        for i in 0..n as i32 {
            dl.push(
                Sp::new(cap, r.x + tw * (i as f32 + 0.5), r.y + cap_h * 0.5)
                    .size(tw + 1.5, cap_h)
                    .tint(amb.0, amb.1, amb.2)
                    .layer(layer::GROUND + 1),
            );
        }

        // Deck sections get a shaded skirt so they read as raised.
        if s.surface == Surface::Deck && r.h > 80.0 {
            dl.rect_fill(
                rect(r.x, r.y + cap_h - 2.0, r.w, 90.0),
                (0.22 * amb.0, 0.15 * amb.1, 0.10 * amb.2),
                0.75,
                layer::GROUND + 2,
            );
        }
    }
}

// ---------------------------------------------------------------------------
// Traps
// ---------------------------------------------------------------------------

pub fn draw_traps(dl: &mut DrawList, lvl: &Level, t: f32) {
    let amb = lvl.ambient;
    for tr in lvl.traps.iter() {
        let shade = (amb.0, amb.1, amb.2);
        match tr.kind {
            TrapKind::Snap => {
                let fired = matches!(tr.state, TrapState::Fired | TrapState::Disarmed);
                let sprite = if fired { S_TRAP_SNAP_FIRED } else { S_TRAP_SNAP_SET };
                // A tense little shiver once the trigger is tripped.
                let shiver = if tr.state == TrapState::Triggered {
                    (t * 70.0).sin() * 3.0
                } else {
                    0.0
                };
                dl.push(
                    Sp::new(sprite, tr.pos.x + shiver, tr.pos.y - 32.0)
                        .scale(0.92)
                        .flip_x(tr.facing < 0.0)
                        .tint(shade.0, shade.1, shade.2)
                        .layer(layer::PROP + 4),
                );
                if tr.state == TrapState::Disarmed {
                    dl.push(
                        Sp::new(S_STAR, tr.pos.x, tr.pos.y - 90.0)
                            .width(40.0)
                            .alpha(0.8)
                            .blend(BLEND_ADD)
                            .layer(layer::FX),
                    );
                }
            }
            TrapKind::Glue => {
                dl.push(
                    Sp::new(S_TRAP_GLUE, tr.pos.x, tr.pos.y - 14.0)
                        .scale(1.0)
                        .tint(shade.0, shade.1, shade.2)
                        .layer(layer::PROP + 4),
                );
            }
            TrapKind::Bucket => {
                // Hangs overhead until something walks underneath.
                let drop = ease_out_cubic(clamp(tr.anim, 0.0, 1.0));
                let tip = tr.anim * 1.4;
                dl.push(
                    Sp::new(S_TRAP_BUCKET, tr.pos.x, tr.pos.y + drop * 240.0)
                        .scale(1.0)
                        .rot(tip * 0.5)
                        .tint(shade.0, shade.1, shade.2)
                        .layer(layer::PROP + 4),
                );
                if tr.state == TrapState::Armed {
                    // Telegraph: a shadow on the ground below.
                    dl.shadow(tr.pos.x, tr.pos.y + 300.0, 180.0, 0.3);
                }
            }
            TrapKind::Zapper => {
                dl.push(
                    Sp::new(S_TRAP_ZAPPER, tr.pos.x, tr.pos.y - 70.0)
                        .scale(0.95)
                        .tint(shade.0, shade.1, shade.2)
                        .layer(layer::PROP + 4),
                );
                let hot = tr.anim;
                if hot > 0.0 {
                    // Arc, plus a warm pool of light on the ground.
                    for i in 0..3 {
                        let o = i as f32 * 0.7;
                        dl.push(
                            Sp::new(S_SPARK, tr.pos.x + (t * 30.0 + o).sin() * 16.0, tr.pos.y - 58.0)
                                .width(150.0 + (t * 40.0 + o).sin() * 22.0)
                                .rot((t * 26.0 + o).sin() * 0.5)
                                .alpha(hot * 0.9)
                                .blend(BLEND_ADD)
                                .layer(layer::FX),
                        );
                    }
                    dl.push(
                        Sp::new(S_GLOW, tr.pos.x, tr.pos.y - 50.0)
                            .width(420.0)
                            .tint(0.6, 0.85, 1.0)
                            .alpha(hot * 0.5)
                            .blend(BLEND_ADD)
                            .layer(layer::FX),
                    );
                } else if tr.timer < 0.55 {
                    // About to fire: a faint charging hum.
                    let f = 1.0 - tr.timer / 0.55;
                    dl.push(
                        Sp::new(S_GLOW, tr.pos.x, tr.pos.y - 50.0)
                            .width(180.0 * f)
                            .tint(0.7, 0.9, 1.0)
                            .alpha(f * 0.5)
                            .blend(BLEND_ADD)
                            .layer(layer::FX),
                    );
                }
            }
            TrapKind::Bait => {
                dl.push(
                    Sp::new(S_BAIT_STATION, tr.pos.x, tr.pos.y - 52.0)
                        .scale(0.95)
                        .flip_x(tr.facing < 0.0)
                        .tint(shade.0, shade.1, shade.2)
                        .layer(layer::PROP + 4),
                );
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Food
// ---------------------------------------------------------------------------

pub fn draw_pickups(dl: &mut DrawList, lvl: &Level, t: f32) {
    for p in lvl.pickups.iter() {
        if p.taken {
            continue;
        }
        // Food still sitting on an armed trap is shown dimmed and shaking.
        let guarded = p.trap >= 0
            && !matches!(
                lvl.traps[p.trap as usize].state,
                TrapState::Disarmed | TrapState::Fired
            );
        let bob = (t * 2.4 + p.bob).sin() * 7.0;
        let size = p.food.display_size();
        let a = if guarded { 0.82 } else { 1.0 };

        if !guarded {
            dl.push(
                Sp::new(S_GLOW, p.pos.x, p.pos.y + bob)
                    .width(size * 2.4)
                    .alpha(0.34 + (t * 3.0 + p.bob).sin() * 0.08)
                    .blend(BLEND_ADD)
                    .layer(layer::ITEM - 1),
            );
        }
        dl.push(
            Sp::new(p.food.sprite(), p.pos.x, p.pos.y + bob)
                .width(size)
                .rot((t * 1.6 + p.bob).sin() * 0.09)
                .alpha(a)
                .layer(layer::ITEM),
        );
    }
}

// ---------------------------------------------------------------------------
// NPCs, with their vision cones
// ---------------------------------------------------------------------------

pub fn draw_npcs(dl: &mut DrawList, lvl: &Level, t: f32) {
    for n in lvl.npcs.iter() {
        // --- vision cone ---
        let dir = match n.kind {
            NpcKind::WillLight => v2(n.look.cos() * n.facing, n.look.sin().abs()).norm(),
            _ => v2(n.facing, n.look * 0.35).norm(),
        };
        let eye = n.eye();
        let range = n.cone_range;
        let half_h = range * n.cone_half.tan() * 2.0;
        let ang = dir.y.atan2(dir.x);
        let c = eye.add(dir.scale(range * 0.5));
        let alert = clamp(n.suspicion, 0.0, 1.0);
        let is_light = n.kind == NpcKind::WillLight;
        let sprite = if is_light { S_LIGHT_CONE } else { S_VISION_CONE };
        let (cr, cg, cb) = if n.state == NpcState::Chase {
            (1.0, 0.42, 0.34)
        } else {
            (1.0, 0.94 - alert * 0.3, 0.72 - alert * 0.4)
        };
        let base_a = if is_light { 0.0 } else { 0.5 };
        if (n.state != NpcState::Distracted) && !is_light && n.kind != NpcKind::Raccoon {
            dl.push(
                Sp::new(sprite, c.x, c.y)
                    .size(range, half_h.max(120.0))
                    .rot(ang)
                    .tint(cr, cg, cb)
                    .alpha(base_a * (0.55 + alert * 0.45))
                    .blend(BLEND_ADD)
                    .layer(layer::LIGHT),
            );
        }

        // --- the character ---
        match n.kind {
            NpcKind::Raccoon => {
                if n.state != NpcState::Hiding {
                    dl.shadow(n.pos.x, n.pos.y - 6.0, 280.0, 0.42);
                }
                // Thermal sees the body heat straight through the bin it is
                // sitting in -- this is what makes IR worth having here.
                if dl.vision == VISION_IR {
                    dl.push(
                        Sp::new(S_LIGHT_BLOB, n.pos.x, n.pos.y - 110.0)
                            .width(300.0)
                            .tint(1.9, 0.75, 0.25)
                            .alpha(if n.state == NpcState::Hiding { 0.65 } else { 0.4 })
                            .blend(BLEND_ADD)
                            .layer(layer::FRONT_PROP + 2),
                    );
                }
                puppet::draw_raccoon(dl, n, t);
            }
            NpcKind::Popcorn => {
                dl.shadow(n.pos.x, n.pos.y - 6.0, 300.0, 0.4);
                puppet::draw_popcorn(dl, n, t);
            }
            NpcKind::WillLight => {
                // Only a hand and the torch are visible through the gap.
                dl.push(
                    Sp::new(S_WILL_FLASHLIGHT, eye.x, eye.y)
                        .scale(1.5)
                        .rot(ang)
                        .flip_x(n.facing < 0.0)
                        .layer(layer::PROP + 5),
                );
                dl.push(
                    Sp::new(S_WILL_FOREARM, eye.x - dir.x * 90.0, eye.y - dir.y * 90.0 - 30.0)
                        .scale(1.6)
                        .rot(ang + PI * 0.5)
                        .shade(0.7)
                        .layer(layer::PROP + 4),
                );
            }
            _ => {
                dl.shadow(n.pos.x, n.pos.y - 6.0, 420.0, 0.45);
                puppet::draw_will(dl, n, t);
            }
        }

        // --- suspicion marker above the head ---
        if n.kind == NpcKind::Raccoon && n.state == NpcState::Hiding {
            continue;
        }
        let head_y = n.pos.y - n.eye_h - 150.0;
        if n.state == NpcState::Chase {
            let pop = ease_out_back(clamp(n.state_t * 5.0, 0.0, 1.0));
            dl.push(
                Sp::new(S_FX_ALERT, n.pos.x, head_y - 40.0)
                    .height(140.0 * pop)
                    .rot((t * 20.0).sin() * 0.12)
                    .layer(layer::FX),
            );
        } else if n.suspicion > 0.12 {
            let f = clamp(n.suspicion, 0.0, 1.0);
            dl.push(
                Sp::new(S_FX_QUESTION, n.pos.x, head_y - 20.0)
                    .height(60.0 + 70.0 * f)
                    .alpha(0.35 + f * 0.65)
                    .rot((t * 6.0).sin() * 0.08)
                    .layer(layer::FX),
            );
        }
    }
}

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------

pub fn draw_darkness(dl: &mut DrawList, lvl: &Level, p: &Player, t: f32) {
    // A thermal camera does not care how dark it is.
    if dl.vision == VISION_IR {
        return;
    }
    if lvl.dark <= 0.0 {
        return;
    }
    // One flat scrim of night over the world...
    dl.screen_space = true;
    dl.push(
        Sp::new(S_WHITE, dl.view_w * 0.5, dl.view_h * 0.5)
            .size(dl.view_w, dl.view_h)
            .tint(0.04, 0.05, 0.10)
            .alpha(lvl.dark)
            .layer(layer::DARKNESS),
    );
    dl.screen_space = false;

    // ...then everything that gives off light, added back on top.
    let c = p.center();
    dl.push(
        Sp::new(S_LIGHT_BLOB, c.x, c.y)
            .width(840.0 + (t * 2.0).sin() * 20.0)
            .tint(0.52, 0.47, 0.38)
            .alpha(0.34 * lvl.dark)
            .blend(BLEND_ADD)
            .layer(layer::DARKNESS + 5),
    );

    for n in lvl.npcs.iter() {
        if n.kind != NpcKind::WillLight {
            continue;
        }
        let dir = v2(n.look.cos() * n.facing, n.look.sin().abs()).norm();
        let eye = n.eye();
        let range = n.cone_range;
        let ang = dir.y.atan2(dir.x);
        let cc = eye.add(dir.scale(range * 0.5));
        dl.push(
            Sp::new(S_LIGHT_CONE, cc.x, cc.y)
                .size(range, (range * n.cone_half.tan() * 2.0).max(160.0))
                .rot(ang)
                .tint(0.95, 0.88, 0.66)
                .alpha(0.5)
                .blend(BLEND_ADD)
                .layer(layer::DARKNESS + 5),
        );
    }

    // Lit pickups and hot traps glow through the dark.
    for pk in lvl.pickups.iter() {
        if pk.taken {
            continue;
        }
        dl.push(
            Sp::new(S_LIGHT_BLOB, pk.pos.x, pk.pos.y)
                .width(170.0)
                .tint(1.0, 0.86, 0.55)
                .alpha(0.16)
                .blend(BLEND_ADD)
                .layer(layer::DARKNESS + 5),
        );
    }
}

/// Scanlines, sensor noise and a cold cast -- the look of a cheap thermal cam.
pub fn draw_ir_overlay(dl: &mut DrawList, t: f32) {
    dl.screen_space = true;
    let (w, h) = (dl.view_w, dl.view_h);
    // Cold floor under everything, so untouched pixels are not pure black.
    dl.push(
        Sp::new(S_WHITE, w * 0.5, h * 0.5)
            .size(w, h)
            .tint(0.02, 0.08, 0.12)
            .alpha(0.55)
            .blend(BLEND_ADD)
            .layer(layer::DARKNESS + 2),
    );
    // Drifting sensor grain.
    dl.push(
        Sp::new(S_IR_NOISE, w * 0.5 + (t * 37.0) % 9.0, h * 0.5 + (t * 53.0) % 7.0)
            .size(w * 1.1, h * 1.1)
            .alpha(0.09)
            .blend(BLEND_ADD)
            .layer(layer::OVERLAY - 2),
    );
    // Scanlines.
    dl.push(
        Sp::new(S_IR_SCAN, w * 0.5, h * 0.5)
            .size(w, h)
            .blend(BLEND_MUL)
            .alpha(1.0)
            .layer(layer::OVERLAY - 1),
    );
    // A bright bar sweeping down the frame, like a refresh.
    let sweep = ((t * 0.35) % 1.0) * h;
    dl.push(
        Sp::new(S_WHITE, w * 0.5, sweep)
            .size(w, 54.0)
            .tint(0.35, 0.8, 0.9)
            .alpha(0.05)
            .blend(BLEND_ADD)
            .layer(layer::OVERLAY - 1),
    );
    dl.screen_space = false;
}

pub fn draw_overlay(dl: &mut DrawList, lvl: &Level) {
    dl.screen_space = true;
    dl.push(
        Sp::new(S_VIGNETTE, dl.view_w * 0.5, dl.view_h * 0.5)
            .size(dl.view_w, dl.view_h)
            .blend(BLEND_MUL)
            .alpha(if lvl.mood == Mood::Underside { 1.0 } else { 0.78 })
            .layer(layer::OVERLAY),
    );
    dl.screen_space = false;
}
