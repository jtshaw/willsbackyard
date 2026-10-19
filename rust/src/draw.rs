#![allow(dead_code)]

use crate::math::*;
use crate::sprites::*;

pub const CMD_STRIDE: usize = 12;
pub const MAX_CMDS: usize = 6000;

// Blend modes -- must match gl.js.
pub const BLEND_ALPHA: u32 = 0;
pub const BLEND_ADD: u32 = 1;
pub const BLEND_MUL: u32 = 2;

pub const FLIP_X: u32 = 1;
pub const FLIP_Y: u32 = 2;

pub const VISION_NORMAL: u32 = 0;
pub const VISION_IR: u32 = 1;

/// How warm a thing looks to a thermal camera, 0 (cold) .. 1 (body heat).
fn ir_heat(sprite: u16, lay: i32) -> f32 {
    // Anything living reads hottest.
    if (layer::ACTOR_BACK..=layer::ACTOR_FRONT).contains(&lay) {
        return 1.0;
    }
    match sprite {
        S_FLAME | S_SPARK => 1.0,
        S_BBQ_GRILL => 0.85,
        S_TRAP_ZAPPER => 0.55,
        // Food still holds the warmth of the kitchen.
        S_FOOD_HOTDOG | S_FOOD_BACON => 0.7,
        S_FOOD_COOKIE | S_FOOD_CHEESE | S_FOOD_MARSHMALLOW => 0.35,
        S_HOUSE_WINDOW_LIT => 0.5,
        _ => 0.0,
    }
}

/// Steel traps sit at ambient temperature -- nearly invisible on thermal.
fn is_cold_metal(sprite: u16) -> bool {
    matches!(
        sprite,
        S_TRAP_SNAP_SET | S_TRAP_SNAP_FIRED | S_TRAP_GLUE | S_TRAP_BUCKET | S_BAIT_STATION
    )
}

/// Back-to-front draw order. Anything sharing a layer keeps insertion order.
pub mod layer {
    pub const SKY: i32 = 0;
    pub const FAR: i32 = 10;
    pub const MID: i32 = 20;
    pub const BACKDROP: i32 = 30;
    pub const BEHIND: i32 = 40;
    pub const SHADOW: i32 = 50;
    pub const GROUND: i32 = 60;
    pub const PROP: i32 = 70;
    pub const ACTOR_BACK: i32 = 80;
    pub const ACTOR: i32 = 90;
    pub const ACTOR_FRONT: i32 = 100;
    pub const ITEM: i32 = 110;
    pub const FRONT_PROP: i32 = 120;
    pub const FX: i32 = 130;
    pub const LIGHT: i32 = 140;
    pub const DARKNESS: i32 = 150;
    pub const OVERLAY: i32 = 160;
}

#[derive(Clone, Copy)]
pub struct Cmd {
    pub layer: i32,
    pub seq: u32,
    pub sprite: u16,
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
    pub rot: f32,
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub a: f32,
    pub flags: u32,
}

/// A sprite placement request. Built with a small fluent API so call sites at
/// the scene level stay readable.
pub struct Sp {
    c: Cmd,
}

impl Sp {
    pub fn new(sprite: u16, x: f32, y: f32) -> Sp {
        Sp {
            c: Cmd {
                layer: layer::PROP,
                seq: 0,
                sprite,
                x,
                y,
                w: sprite_w(sprite),
                h: sprite_h(sprite),
                rot: 0.0,
                r: 1.0,
                g: 1.0,
                b: 1.0,
                a: 1.0,
                flags: 0,
            },
        }
    }
    pub fn size(mut self, w: f32, h: f32) -> Sp {
        self.c.w = w;
        self.c.h = h;
        self
    }
    /// Uniform scale around the sprite's authored size.
    pub fn scale(mut self, s: f32) -> Sp {
        self.c.w *= s;
        self.c.h *= s;
        self
    }
    pub fn scale_xy(mut self, sx: f32, sy: f32) -> Sp {
        self.c.w *= sx;
        self.c.h *= sy;
        self
    }
    /// Fit to a width, preserving the authored aspect.
    pub fn width(mut self, w: f32) -> Sp {
        let a = self.c.h / self.c.w;
        self.c.w = w;
        self.c.h = w * a;
        self
    }
    pub fn height(mut self, h: f32) -> Sp {
        let a = self.c.w / self.c.h;
        self.c.h = h;
        self.c.w = h * a;
        self
    }
    pub fn rot(mut self, r: f32) -> Sp {
        self.c.rot = r;
        self
    }
    pub fn layer(mut self, l: i32) -> Sp {
        self.c.layer = l;
        self
    }
    pub fn tint(mut self, r: f32, g: f32, b: f32) -> Sp {
        self.c.r = r;
        self.c.g = g;
        self.c.b = b;
        self
    }
    pub fn shade(mut self, v: f32) -> Sp {
        self.c.r *= v;
        self.c.g *= v;
        self.c.b *= v;
        self
    }
    pub fn alpha(mut self, a: f32) -> Sp {
        self.c.a = a;
        self
    }
    pub fn flip_x(mut self, f: bool) -> Sp {
        if f {
            self.c.flags |= FLIP_X;
        }
        self
    }
    pub fn flip_y(mut self, f: bool) -> Sp {
        if f {
            self.c.flags |= FLIP_Y;
        }
        self
    }
    pub fn blend(mut self, mode: u32) -> Sp {
        self.c.flags = (self.c.flags & !0b1100) | (mode << 2);
        self
    }
    /// Places the sprite by its top-left instead of its centre.
    pub fn at_top_left(mut self) -> Sp {
        self.c.x += self.c.w * 0.5;
        self.c.y += self.c.h * 0.5;
        self
    }
    /// Places the sprite standing on (x, y).
    pub fn anchor_bottom(mut self) -> Sp {
        self.c.y -= self.c.h * 0.5;
        self
    }
    pub fn offset(mut self, dx: f32, dy: f32) -> Sp {
        self.c.x += dx;
        self.c.y += dy;
        self
    }
    /// Rotates the quad about an arbitrary pivot given in local units,
    /// measured from the sprite centre before rotation.
    pub fn pivot(mut self, px: f32, py: f32) -> Sp {
        let o = v2(-px, -py).rot(self.c.rot);
        self.c.x += o.x;
        self.c.y += o.y;
        self
    }
}

pub struct DrawList {
    pub cmds: Vec<Cmd>,
    seq: u32,
    /// World-to-screen transform applied as commands are pushed.
    pub cam_x: f32,
    pub cam_y: f32,
    pub zoom: f32,
    pub view_w: f32,
    pub view_h: f32,
    /// Parallax factor applied to the current push batch (1.0 == world speed).
    pub parallax: f32,
    pub screen_space: bool,
    /// Camera mode. Infrared repaints the whole frame by temperature.
    pub vision: u32,
}

impl DrawList {
    pub fn new() -> DrawList {
        DrawList {
            cmds: Vec::with_capacity(MAX_CMDS),
            seq: 0,
            cam_x: 0.0,
            cam_y: 0.0,
            zoom: 1.0,
            view_w: 1920.0,
            view_h: 1080.0,
            parallax: 1.0,
            screen_space: false,
            vision: VISION_NORMAL,
        }
    }

    pub fn clear(&mut self) {
        self.cmds.clear();
        self.seq = 0;
        self.parallax = 1.0;
        self.screen_space = false;
    }

    pub fn world_to_screen(&self, x: f32, y: f32, parallax: f32) -> (f32, f32) {
        let sx = (x - self.cam_x * parallax) * self.zoom + self.view_w * 0.5;
        let sy = (y - self.cam_y * parallax) * self.zoom + self.view_h * 0.5;
        (sx, sy)
    }

    /// Repaints a command by temperature instead of colour.
    fn apply_vision(&self, c: &mut Cmd) {
        if self.vision != VISION_IR {
            return;
        }
        let blend = (c.flags >> 2) & 3;
        if blend == BLEND_MUL {
            return; // vignette and darkness pass through untouched
        }
        let heat = ir_heat(c.sprite, c.layer);
        if heat > 0.0 {
            // Thermal ramp: deep red through orange into a blown-out white.
            c.r = 0.5 + 1.5 * heat;
            c.g = 0.12 + 0.95 * heat * heat;
            c.b = 0.08 + 0.35 * heat * heat * heat;
        } else if blend == BLEND_ADD {
            // Visible light barely registers on a thermal sensor.
            c.r = 0.16;
            c.g = 0.28;
            c.b = 0.32;
            c.a *= 0.30;
        } else if is_cold_metal(c.sprite) {
            c.r = 0.05;
            c.g = 0.10;
            c.b = 0.15;
        } else {
            // Everything else: cold, and colder the further back it sits.
            let depth = 1.0 - ((c.layer as f32 - layer::SKY as f32) / 140.0).clamp(0.0, 0.8);
            c.r = 0.05 + 0.05 * (1.0 - depth);
            c.g = 0.14 + 0.16 * (1.0 - depth);
            c.b = 0.22 + 0.16 * (1.0 - depth);
        }
    }

    pub fn push(&mut self, sp: Sp) {
        if self.cmds.len() >= MAX_CMDS {
            return;
        }
        let mut c = sp.c;
        self.apply_vision(&mut c);
        if !self.screen_space {
            let (sx, sy) = self.world_to_screen(c.x, c.y, self.parallax);
            c.x = sx;
            c.y = sy;
            c.w *= self.zoom;
            c.h *= self.zoom;
        }
        // Cull anything fully outside the viewport.
        let r = (c.w.abs() + c.h.abs()) * 0.75;
        if c.x + r < 0.0 || c.x - r > self.view_w || c.y + r < 0.0 || c.y - r > self.view_h {
            return;
        }
        c.seq = self.seq;
        self.seq += 1;
        self.cmds.push(c);
    }

    /// Convenience: a solid colour rectangle, in world space.
    pub fn rect_fill(&mut self, r: Rect, col: (f32, f32, f32), a: f32, layer: i32) {
        self.push(
            Sp::new(S_WHITE, r.cx(), r.cy())
                .size(r.w, r.h)
                .tint(col.0, col.1, col.2)
                .alpha(a)
                .layer(layer),
        );
    }

    /// A contact shadow pooled beneath an actor.
    pub fn shadow(&mut self, x: f32, y: f32, w: f32, a: f32) {
        self.push(
            Sp::new(S_SHADOW, x, y)
                .width(w)
                .alpha(a)
                .layer(layer::SHADOW),
        );
    }

    pub fn sort(&mut self) {
        self.cmds
            .sort_by(|a, b| a.layer.cmp(&b.layer).then(a.seq.cmp(&b.seq)));
    }

    /// Flattens into the float buffer the renderer reads.
    pub fn write(&self, out: &mut [f32]) -> usize {
        let n = self.cmds.len().min(MAX_CMDS);
        for (i, c) in self.cmds.iter().take(n).enumerate() {
            let o = i * CMD_STRIDE;
            out[o] = c.sprite as f32;
            out[o + 1] = c.x;
            out[o + 2] = c.y;
            out[o + 3] = c.w;
            out[o + 4] = c.h;
            out[o + 5] = c.rot;
            out[o + 6] = c.r;
            out[o + 7] = c.g;
            out[o + 8] = c.b;
            out[o + 9] = c.a;
            out[o + 10] = c.flags as f32;
            out[o + 11] = 0.0;
        }
        n
    }
}
