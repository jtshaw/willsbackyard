#![allow(dead_code)]

pub const TAU: f32 = core::f32::consts::TAU;
pub const PI: f32 = core::f32::consts::PI;

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct V2 {
    pub x: f32,
    pub y: f32,
}

pub const fn v2(x: f32, y: f32) -> V2 {
    V2 { x, y }
}

impl V2 {
    pub fn len(self) -> f32 {
        (self.x * self.x + self.y * self.y).sqrt()
    }
    pub fn len2(self) -> f32 {
        self.x * self.x + self.y * self.y
    }
    pub fn norm(self) -> V2 {
        let l = self.len();
        if l > 1e-6 {
            v2(self.x / l, self.y / l)
        } else {
            v2(0.0, 0.0)
        }
    }
    pub fn dot(self, o: V2) -> f32 {
        self.x * o.x + self.y * o.y
    }
    pub fn scale(self, s: f32) -> V2 {
        v2(self.x * s, self.y * s)
    }
    pub fn add(self, o: V2) -> V2 {
        v2(self.x + o.x, self.y + o.y)
    }
    pub fn sub(self, o: V2) -> V2 {
        v2(self.x - o.x, self.y - o.y)
    }
    pub fn rot(self, a: f32) -> V2 {
        let (s, c) = (a.sin(), a.cos());
        v2(self.x * c - self.y * s, self.x * s + self.y * c)
    }
    pub fn dist(self, o: V2) -> f32 {
        self.sub(o).len()
    }
}

/// Axis-aligned rectangle, stored as a top-left corner plus a size.
#[derive(Clone, Copy, Debug, Default)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
}

pub const fn rect(x: f32, y: f32, w: f32, h: f32) -> Rect {
    Rect { x, y, w, h }
}

impl Rect {
    pub fn right(&self) -> f32 {
        self.x + self.w
    }
    pub fn bottom(&self) -> f32 {
        self.y + self.h
    }
    pub fn cx(&self) -> f32 {
        self.x + self.w * 0.5
    }
    pub fn cy(&self) -> f32 {
        self.y + self.h * 0.5
    }
    pub fn center(&self) -> V2 {
        v2(self.cx(), self.cy())
    }
    pub fn overlaps(&self, o: &Rect) -> bool {
        self.x < o.right() && o.x < self.right() && self.y < o.bottom() && o.y < self.bottom()
    }
    pub fn contains(&self, p: V2) -> bool {
        p.x >= self.x && p.x <= self.right() && p.y >= self.y && p.y <= self.bottom()
    }
    pub fn inflate(&self, d: f32) -> Rect {
        rect(self.x - d, self.y - d, self.w + d * 2.0, self.h + d * 2.0)
    }
    /// Shortest distance from a point to the rectangle (0 when inside).
    pub fn dist_to(&self, p: V2) -> f32 {
        let dx = (self.x - p.x).max(0.0).max(p.x - self.right());
        let dy = (self.y - p.y).max(0.0).max(p.y - self.bottom());
        (dx * dx + dy * dy).sqrt()
    }
}

// ---- scalar helpers --------------------------------------------------------

pub fn clamp(v: f32, lo: f32, hi: f32) -> f32 {
    if v < lo {
        lo
    } else if v > hi {
        hi
    } else {
        v
    }
}
pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}
/// Frame-rate independent exponential smoothing.
pub fn damp(a: f32, b: f32, rate: f32, dt: f32) -> f32 {
    lerp(a, b, 1.0 - (-rate * dt).exp())
}
/// Moves `a` toward `b` by at most `step`.
pub fn approach(a: f32, b: f32, step: f32) -> f32 {
    if a < b {
        (a + step).min(b)
    } else {
        (a - step).max(b)
    }
}
pub fn sign(v: f32) -> f32 {
    if v > 0.0 {
        1.0
    } else if v < 0.0 {
        -1.0
    } else {
        0.0
    }
}
pub fn smoothstep(t: f32) -> f32 {
    let t = clamp(t, 0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}
pub fn ease_out_back(t: f32) -> f32 {
    let c1 = 1.70158;
    let c3 = c1 + 1.0;
    let p = t - 1.0;
    1.0 + c3 * p * p * p + c1 * p * p
}
pub fn ease_out_cubic(t: f32) -> f32 {
    let p = 1.0 - t;
    1.0 - p * p * p
}
pub fn wrap_angle(a: f32) -> f32 {
    let mut a = a;
    while a > PI {
        a -= TAU;
    }
    while a < -PI {
        a += TAU;
    }
    a
}

// ---- deterministic rng -----------------------------------------------------

#[derive(Clone, Copy)]
pub struct Rng(pub u32);

impl Rng {
    pub fn new(seed: u32) -> Rng {
        Rng(if seed == 0 { 0x9E3779B9 } else { seed })
    }
    pub fn next_u32(&mut self) -> u32 {
        // xorshift32
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.0 = x;
        x
    }
    pub fn f(&mut self) -> f32 {
        (self.next_u32() >> 8) as f32 / 16777216.0
    }
    pub fn range(&mut self, lo: f32, hi: f32) -> f32 {
        lo + self.f() * (hi - lo)
    }
    pub fn chance(&mut self, p: f32) -> bool {
        self.f() < p
    }
    pub fn pick<T: Copy>(&mut self, items: &[T]) -> T {
        items[(self.next_u32() as usize) % items.len()]
    }
}

/// Cheap hash-based value noise -- stable per (x, seed), no state.
pub fn hash_f(x: i32, seed: u32) -> f32 {
    let mut h = (x as u32).wrapping_mul(0x9E3779B9) ^ seed.wrapping_mul(0x85EBCA6B);
    h ^= h >> 15;
    h = h.wrapping_mul(0x2C1B3C6D);
    h ^= h >> 12;
    h = h.wrapping_mul(0x297A2D39);
    h ^= h >> 15;
    (h >> 8) as f32 / 16777216.0
}

/// Ray-vs-rectangle test used for line-of-sight checks.
pub fn seg_hits_rect(a: V2, b: V2, r: &Rect) -> bool {
    // Slab method against the segment's parametric range.
    let d = b.sub(a);
    let mut t0 = 0.0f32;
    let mut t1 = 1.0f32;
    for axis in 0..2 {
        let (origin, dir, lo, hi) = if axis == 0 {
            (a.x, d.x, r.x, r.right())
        } else {
            (a.y, d.y, r.y, r.bottom())
        };
        if dir.abs() < 1e-6 {
            if origin < lo || origin > hi {
                return false;
            }
        } else {
            let inv = 1.0 / dir;
            let mut tn = (lo - origin) * inv;
            let mut tf = (hi - origin) * inv;
            if tn > tf {
                core::mem::swap(&mut tn, &mut tf);
            }
            t0 = t0.max(tn);
            t1 = t1.min(tf);
            if t0 > t1 {
                return false;
            }
        }
    }
    true
}
