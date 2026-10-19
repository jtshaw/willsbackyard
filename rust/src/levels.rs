#![allow(dead_code)]

use crate::draw::layer;
use crate::level::*;
use crate::math::*;
use crate::sprites::*;

pub const LEVEL_COUNT: usize = 5;

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

fn ground(l: &mut Level, x0: f32, x1: f32, y: f32, s: Surface) {
    l.solids.push(Solid::new(x0, y, x1 - x0, 1400.0, s));
}

fn block(l: &mut Level, x: f32, y: f32, w: f32, h: f32, s: Surface) {
    l.solids.push(Solid::new(x, y, w, h, s));
}

/// Jump-through platform; `y` is the surface the rat stands on.
fn plat(l: &mut Level, x: f32, y: f32, w: f32, s: Surface) {
    l.solids.push(Solid::new(x, y, w, 26.0, s).thru());
}

fn cover(l: &mut Level, x: f32, y: f32, w: f32, h: f32, needs_crouch: bool) {
    l.covers.push(Cover {
        r: rect(x, y, w, h),
        needs_crouch,
    });
}

/// Scatters grass tufts and fallen leaves along a ground line.
fn scatter_lawn(l: &mut Level, x0: f32, x1: f32, y: f32, seed: u32, leafy: bool) {
    let n = ((x1 - x0) / 150.0) as i32;
    for i in 0..n {
        let h1 = hash_f(i, seed);
        let h2 = hash_f(i, seed ^ 0x5bd1);
        let h3 = hash_f(i, seed ^ 0x9e37);
        let x = x0 + (i as f32 + h1) * 150.0;
        if h2 < 0.42 {
            l.decor.push(
                Decor::new(S_BUSH, x, y + 10.0)
                    .width(90.0 + h3 * 150.0)
                    .shade(0.82 + h1 * 0.2)
                    .standing()
                    .layer(layer::GROUND + 1)
                    .sway(0.02),
            );
        }
        if leafy && h3 < 0.75 {
            let tint = [
                (0.94, 0.68, 0.26),
                (0.82, 0.42, 0.16),
                (0.74, 0.26, 0.19),
                (0.96, 0.80, 0.28),
            ][(h2 * 4.0) as usize % 4];
            l.decor.push(
                Decor::new(S_LEAF, x + h2 * 90.0, y - 8.0)
                    .width(34.0 + h1 * 26.0)
                    .rot((h1 - 0.5) * 2.4)
                    .tint(tint.0, tint.1, tint.2)
                    .layer(layer::GROUND + 2),
            );
        }
    }
}

/// A run of cedar fence boards with two rails behind them.
/// A run of cedar boards. Kept deliberately short so the sky still reads --
/// a true-scale fence next to a rat would wall off the whole frame.
fn fence_run(l: &mut Level, x0: f32, x1: f32, y: f32, par: f32, shade: f32, height: f32) {
    let step = 52.0;
    l.decor.push(
        Decor::new(S_FENCE_RAIL, (x0 + x1) * 0.5, y - height * 0.62)
            .size(x1 - x0, 30.0)
            .par(par)
            .shade(shade * 0.88)
            .layer(layer::MID),
    );
    l.decor.push(
        Decor::new(S_FENCE_RAIL, (x0 + x1) * 0.5, y - height * 0.2)
            .size(x1 - x0, 30.0)
            .par(par)
            .shade(shade * 0.88)
            .layer(layer::MID),
    );
    let n = ((x1 - x0) / step) as i32;
    for i in 0..n {
        let x = x0 + i as f32 * step + step * 0.5;
        let j = hash_f(i, 0x7a31) * 0.08;
        l.decor.push(
            Decor::new(S_FENCE_BOARD, x, y)
                .size(step + 4.0, height * (0.97 + j))
                .par(par)
                .shade(shade * (0.93 + hash_f(i, 0x113) * 0.12))
                .standing()
                .layer(layer::MID + 1),
        );
    }
}

fn tree(l: &mut Level, x: f32, y: f32, s: f32, par: f32, shade: f32, fall: bool) {
    l.decor.push(
        Decor::new(S_TREE_TRUNK, x, y)
            .scale(s)
            .par(par)
            .shade(shade)
            .standing()
            .layer(layer::FAR + 1),
    );
    let crown = if fall { S_FOLIAGE_FALL } else { S_FOLIAGE_A };
    l.decor.push(
        Decor::new(crown, x - 60.0 * s, y - 400.0 * s)
            .scale(s * 1.5)
            .par(par)
            .shade(shade)
            .layer(layer::FAR + 2)
            .sway(0.028),
    );
    l.decor.push(
        Decor::new(S_FOLIAGE_B, x + 90.0 * s, y - 330.0 * s)
            .scale(s * 1.3)
            .par(par)
            .shade(shade * 0.92)
            .layer(layer::FAR + 2)
            .sway(0.034),
    );
    l.decor.push(
        Decor::new(if fall { S_FOLIAGE_FALL } else { S_FOLIAGE_C }, x + 10.0 * s, y - 520.0 * s)
            .scale(s * 1.15)
            .par(par)
            .shade(shade * 1.04)
            .layer(layer::FAR + 3)
            .sway(0.04),
    );
}

/// The blue-sided house that backs onto the yard.
fn house(l: &mut Level, x0: f32, x1: f32, base_y: f32, par: f32, lit: bool) {
    house_h(l, x0, x1, base_y, par, lit, 560.0)
}

fn house_h(l: &mut Level, x0: f32, x1: f32, base_y: f32, par: f32, lit: bool, h: f32) {
    let w = x1 - x0;
    l.decor.push(
        Decor::new(S_HOUSE_SIDING, (x0 + x1) * 0.5, base_y - h * 0.5)
            .size(w, h)
            .par(par)
            .layer(layer::FAR),
    );
    l.decor.push(
        Decor::new(S_HOUSE_ROOF, (x0 + x1) * 0.5, base_y - h - 60.0)
            .size(w * 1.08, 190.0)
            .par(par)
            .layer(layer::FAR),
    );
    let win = if lit { S_HOUSE_WINDOW_LIT } else { S_HOUSE_WINDOW };
    let n = (w / 700.0).max(1.0) as i32;
    for i in 0..n {
        let x = x0 + (i as f32 + 0.5) * (w / n as f32);
        l.decor.push(
            Decor::new(win, x, base_y - h * 0.62)
                .width(230.0)
                .par(par)
                .layer(layer::FAR + 1),
        );
    }
}

/// Two slim posts holding a platform up, so it reads as built, not floating.
fn support(l: &mut Level, x: f32, y: f32, w: f32, ground_y: f32) {
    let drop = ground_y - y;
    if drop <= 10.0 {
        return;
    }
    for &px in &[x + 26.0, x + w - 26.0] {
        l.decor.push(
            Decor::new(S_POST_WOOD, px, y + 8.0)
                .size(26.0, drop)
                .shade(0.78)
                .at_top_left_y()
                .layer(layer::BACKDROP + 1),
        );
    }
}

/// Goal marker: the neighbour's hedge, drawn behind and in front of the rat.
fn hedge_goal(l: &mut Level, x: f32, y: f32) {
    l.goal = v2(x, y);
    l.decor.push(
        Decor::new(S_HEDGE, x, y + 20.0)
            .scale(1.85)
            .standing()
            .layer(layer::BEHIND)
            .sway(0.012),
    );
    l.decor.push(
        Decor::new(S_HEDGE, x - 300.0, y + 20.0)
            .scale(1.5)
            .shade(0.86)
            .standing()
            .layer(layer::BEHIND)
            .sway(0.016),
    );
    l.decor.push(
        Decor::new(S_HEDGE, x + 330.0, y + 20.0)
            .scale(1.6)
            .shade(0.9)
            .standing()
            .layer(layer::BEHIND)
            .sway(0.014),
    );
    // A few fronds that overlap the rat as it slips inside.
    l.decor.push(
        Decor::new(S_FOLIAGE_C, x - 170.0, y - 120.0)
            .scale(0.8)
            .shade(0.74)
            .layer(layer::FRONT_PROP)
            .sway(0.05),
    );
    l.decor.push(
        Decor::new(S_FOLIAGE_C, x + 180.0, y - 100.0)
            .scale(0.72)
            .shade(0.7)
            .layer(layer::FRONT_PROP)
            .sway(0.055),
    );
}

// ---------------------------------------------------------------------------
// 1 -- The Back Lawn
// A gentle dusk tutorial: run, jump the flowerbed, sneak past a dozing dog.
// ---------------------------------------------------------------------------

fn level_back_lawn() -> Level {
    let mut l = Level::new(0, 0, Mood::Dusk);
    l.bounds = rect(-400.0, -2600.0, 8600.0, 5200.0);
    l.spawn = v2(240.0, 0.0);
    l.loot_required = 2;

    // --- terrain ---
    ground(&mut l, -400.0, 2280.0, 0.0, Surface::Leaves);
    ground(&mut l, 2280.0, 2640.0, 170.0, Surface::Dirt); // the flowerbed dip (shallow enough to climb out of)
    ground(&mut l, 2640.0, 4680.0, 0.0, Surface::Leaves);
    block(&mut l, 4680.0, -180.0, 760.0, 1400.0, Surface::Grass); // raised bed
    ground(&mut l, 5440.0, 8200.0, 0.0, Surface::Leaves);

    // Stepping stones over the dip.
    plat(&mut l, 2300.0, -210.0, 180.0, Surface::Wood);
    plat(&mut l, 2560.0, -330.0, 180.0, Surface::Wood);

    // Upturned flowerpots and a plank up to the raised bed.
    plat(&mut l, 3420.0, -200.0, 220.0, Surface::Wood);
    plat(&mut l, 3860.0, -390.0, 220.0, Surface::Wood);
    plat(&mut l, 4320.0, -360.0, 240.0, Surface::Wood);
    plat(&mut l, 6000.0, -200.0, 260.0, Surface::Wood);
    plat(&mut l, 6420.0, -410.0, 240.0, Surface::Wood);

    // --- backdrop ---
    house_h(&mut l, -900.0, 1500.0, 120.0, 0.34, true, 600.0);
    fence_run(&mut l, 1200.0, 8400.0, -40.0, 0.55, 0.9, 380.0);
    tree(&mut l, 900.0, -30.0, 1.25, 0.42, 0.88, true);
    tree(&mut l, 3300.0, -30.0, 1.5, 0.38, 0.84, true);
    tree(&mut l, 6100.0, -30.0, 1.15, 0.46, 0.9, true);
    tree(&mut l, 7700.0, -30.0, 1.35, 0.4, 0.86, true);
    for i in 0..10 {
        let x = -200.0 + i as f32 * 900.0;
        l.decor.push(
            Decor::new(if i % 2 == 0 { S_CLOUD_A } else { S_CLOUD_B }, x, -900.0 - hash_f(i, 0x31) * 420.0)
                .scale(1.4 + hash_f(i, 0x77) * 0.9)
                .par(0.14)
                .alpha(0.85)
                .layer(layer::SKY + 1),
        );
    }
    scatter_lawn(&mut l, -300.0, 2200.0, 0.0, 0x11, true);
    scatter_lawn(&mut l, 2700.0, 4600.0, 0.0, 0x12, true);
    scatter_lawn(&mut l, 4740.0, 5400.0, -180.0, 0x13, true);
    scatter_lawn(&mut l, 5500.0, 8100.0, 0.0, 0x14, true);

    // Props that sell the yard.
    l.decor.push(Decor::new(S_GREEN_BIN, 1500.0, 0.0).scale(0.95).standing().layer(layer::PROP));
    l.decor.push(Decor::new(S_CHAIR, 5900.0, 0.0).scale(0.9).standing().layer(layer::PROP).flip());
    l.decor.push(Decor::new(S_PUMPKIN, 700.0, 0.0).scale(0.72).standing().layer(layer::PROP));
    l.decor.push(Decor::new(S_PUMPKIN_CARVED, 880.0, 0.0).scale(0.66).standing().layer(layer::PROP));
    l.decor.push(Decor::new(S_TARP, 7000.0, 0.0).scale(0.9).standing().layer(layer::MID + 2).shade(0.92));
    l.decor.push(Decor::new(S_LOG_STACK, 7320.0, 0.0).scale(0.8).standing().layer(layer::PROP).shade(0.95));

    // Each plank rests on a crate that actually reaches the ground.
    for &(x, y, w, gy) in &[
        (2300.0, -190.0, 180.0, 170.0),
        (2560.0, -330.0, 180.0, 170.0),
        (3420.0, -200.0, 220.0, 0.0),
        (3860.0, -390.0, 220.0, 0.0),
        (4320.0, -360.0, 240.0, 0.0),
        (6000.0, -200.0, 260.0, 0.0),
        (6420.0, -410.0, 240.0, 0.0),
    ] {
        l.decor.push(
            Decor::new(S_CRATE, x + w * 0.5, y + 12.0)
                .size(w + 14.0, gy - y)
                .at_top_left_y()
                .layer(layer::PROP)
                .shade(0.95),
        );
    }

    // --- traps ---
    l.traps.push(Trap::new(TrapKind::Snap, 1340.0, 0.0));
    l.traps.push(Trap::new(TrapKind::Snap, 1760.0, 0.0).facing(-1.0));
    l.traps.push(Trap::new(TrapKind::Snap, 3060.0, 0.0));
    l.traps.push(Trap::new(TrapKind::Glue, 4380.0, 0.0).no_food());
    l.traps.push(Trap::new(TrapKind::Snap, 5720.0, 0.0).facing(-1.0));
    l.traps.push(Trap::new(TrapKind::Snap, 6760.0, 0.0));

    // --- food ---
    for i in 0..7 {
        l.pickups.push(Pickup::new(Food::Crumb, 420.0 + i as f32 * 110.0, -70.0));
    }
    l.pickups.push(Pickup::new(Food::Cheese, 2470.0, -430.0));
    for i in 0..5 {
        l.pickups.push(Pickup::new(Food::Crumb, 2900.0 + i as f32 * 120.0, -80.0));
    }
    l.pickups.push(Pickup::new(Food::Seed, 3960.0, -520.0));
    l.pickups.push(Pickup::new(Food::Marshmallow, 6530.0, -540.0));
    for i in 0..6 {
        l.pickups.push(Pickup::new(Food::Crumb, 5000.0 + i as f32 * 115.0, -250.0));
    }

    // --- Popcorn, dozing in the leaves ---
    let mut dog = Npc::new(NpcKind::Popcorn, 5900.0, 0.0).patrol(5500.0, 6600.0);
    dog.state = NpcState::Distracted;
    dog.state_t = 6.0;
    dog.cone_range = 520.0;
    l.npcs.push(dog);

    cover(&mut l, 6960.0, -300.0, 420.0, 320.0, true); // behind the tarp

    l.checkpoints.push(v2(240.0, 0.0));
    l.checkpoints.push(v2(2720.0, 0.0));
    l.checkpoints.push(v2(5520.0, 0.0));
    hedge_goal(&mut l, 7900.0, 0.0);
    l
}

// ---------------------------------------------------------------------------
// 2 -- Deck Feast
// The pumpkin-carving table from the photo, a hot grill, and Will on patrol.
// ---------------------------------------------------------------------------

fn level_deck_feast() -> Level {
    let mut l = Level::new(1, 1, Mood::Afternoon);
    l.bounds = rect(-400.0, -2800.0, 9600.0, 5400.0);
    l.spawn = v2(240.0, 0.0);
    l.loot_required = 3;

    const DECK: f32 = -520.0; // deck surface height

    // --- terrain: lawn, then the under-deck crawlspace, then lawn again ---
    ground(&mut l, -400.0, 9200.0, 0.0, Surface::Grass);

    // The deck itself, from 1500 to 7400.
    block(&mut l, 1500.0, DECK, 5900.0, 150.0, Surface::Deck);
    // Steps up at both ends.
    block(&mut l, 1150.0, -180.0, 200.0, 220.0, Surface::Deck);
    block(&mut l, 1330.0, -360.0, 180.0, 400.0, Surface::Deck);
    block(&mut l, 7400.0, -360.0, 180.0, 400.0, Surface::Deck);
    block(&mut l, 7580.0, -180.0, 220.0, 220.0, Surface::Deck);

    // Posts holding the deck up -- the crawlspace is navigable and unseen.
    for i in 0..10 {
        let x = 1620.0 + i as f32 * 620.0;
        // Decor only -- the whole point of the crawlspace is running through it.
        l.decor.push(
            Decor::new(S_POST_WOOD, x + 24.0, 0.0)
                .size(60.0, 520.0)
                .standing()
                .shade(0.6)
                .layer(layer::BACKDROP),
        );
    }
    // Under-deck is out of Will's sight entirely.
    cover(&mut l, 1500.0, DECK + 160.0, 5900.0, 420.0, false);
    // Without this the sky shows through the crawlspace.
    l.decor.push(
        Decor::new(S_WHITE, 4450.0, DECK + 330.0)
            .size(6000.0, 540.0)
            .tint(0.16, 0.12, 0.09)
            .layer(layer::MID + 6),
    );
    l.decor.push(
        Decor::new(S_SHADOW, 4450.0, DECK + 190.0)
            .size(6000.0, 260.0)
            .alpha(0.8)
            .layer(layer::MID + 7),
    );

    // --- deck furniture ---
    // Picnic table with the red gingham cloth.
    const TABLE: f32 = DECK - 310.0;
    block(&mut l, 3150.0, TABLE, 1300.0, 40.0, Surface::Wood);
    // Benches as mid-height steps.
    plat(&mut l, 3050.0, DECK - 150.0, 260.0, Surface::Wood);
    plat(&mut l, 4330.0, DECK - 150.0, 260.0, Surface::Wood);

    // Cooler and chairs make a route onto the table.
    block(&mut l, 2560.0, DECK - 170.0, 230.0, 170.0, Surface::Plastic);
    plat(&mut l, 5100.0, DECK - 220.0, 260.0, Surface::Plastic);
    plat(&mut l, 5560.0, DECK - 400.0, 240.0, Surface::Wood);

    // The railing: a one-way ledge you can run along.
    plat(&mut l, 6000.0, DECK - 150.0, 220.0, Surface::Wood);
    plat(&mut l, 6200.0, DECK - 330.0, 1100.0, Surface::Wood);

    // --- backdrop ---
    house(&mut l, -900.0, 2600.0, DECK + 160.0, 0.30, false);
    house(&mut l, 5200.0, 8200.0, DECK + 160.0, 0.26, false);
    fence_run(&mut l, 2400.0, 5400.0, -60.0, 0.5, 0.94, 360.0);
    tree(&mut l, 8300.0, -30.0, 1.4, 0.4, 0.9, false);
    tree(&mut l, 4800.0, -200.0, 0.9, 0.3, 0.8, false);
    for i in 0..9 {
        l.decor.push(
            Decor::new(if i % 2 == 0 { S_CLOUD_B } else { S_CLOUD_A }, -200.0 + i as f32 * 1050.0, -1100.0 - hash_f(i, 0x51) * 400.0)
                .scale(1.3 + hash_f(i, 0x91) * 0.8)
                .par(0.12)
                .alpha(0.8)
                .layer(layer::SKY + 1),
        );
    }

    // Deck boards and skirt.
    for i in 0..31 {
        let x = 1500.0 + i as f32 * 192.0;
        l.decor.push(Decor::new(S_DECK_PLANK, x + 96.0, DECK + 28.0).size(194.0, 58.0).layer(layer::GROUND));
        l.decor.push(Decor::new(S_DECK_FACE, x + 96.0, DECK + 100.0).size(194.0, 96.0).shade(0.78).layer(layer::GROUND));
    }
    // Railing posts and balusters along the back of the deck.
    for i in 0..24 {
        let x = 1560.0 + i as f32 * 248.0;
        if x > 7340.0 {
            break;
        }
        l.decor.push(Decor::new(S_RAIL_POST, x, DECK + 10.0).size(46.0, 330.0).standing().shade(0.9).layer(layer::BACKDROP + 2));
        for j in 0..5 {
            l.decor.push(
                Decor::new(S_RAIL_BALUSTER, x + 42.0 + j as f32 * 42.0, DECK - 20.0)
                    .size(20.0, 250.0)
                    .standing()
                    .shade(0.84)
                    .layer(layer::BACKDROP + 1),
            );
        }
    }
    l.decor.push(Decor::new(S_RAIL_TOP, 4450.0, DECK - 300.0).size(5800.0, 28.0).shade(0.95).layer(layer::BACKDROP + 3));

    // Table dressing.
    l.decor.push(Decor::new(S_TABLE_TOP, 3800.0, TABLE + 22.0).size(1320.0, 46.0).layer(layer::PROP));
    l.decor.push(Decor::new(S_CLOTH_DRAPE, 3800.0, TABLE + 110.0).size(1340.0, 190.0).layer(layer::PROP + 1));
    l.decor.push(Decor::new(S_TABLE_LEG, 3300.0, TABLE + 180.0).size(44.0, 300.0).shade(0.8).layer(layer::BACKDROP));
    l.decor.push(Decor::new(S_TABLE_LEG, 4300.0, TABLE + 180.0).size(44.0, 300.0).shade(0.8).layer(layer::BACKDROP));

    // The pumpkins, straight from the reference.
    l.decor.push(Decor::new(S_PUMPKIN, 3340.0, TABLE).scale(0.78).standing().layer(layer::PROP + 2));
    l.decor.push(Decor::new(S_PUMPKIN_CARVED, 3640.0, TABLE).scale(0.86).standing().layer(layer::PROP + 2));
    l.decor.push(Decor::new(S_PUMPKIN, 3980.0, TABLE).scale(0.7).standing().layer(layer::PROP + 2).flip());
    l.decor.push(Decor::new(S_PUMPKIN_CARVED, 4280.0, TABLE).scale(0.74).standing().layer(layer::PROP + 2));
    l.decor.push(Decor::new(S_PLATE, 3480.0, TABLE - 4.0).scale(0.8).standing().layer(layer::PROP + 3));
    l.decor.push(Decor::new(S_PLATE, 4130.0, TABLE - 4.0).scale(0.8).standing().layer(layer::PROP + 3));
    l.decor.push(Decor::new(S_BOTTLE, 3820.0, TABLE).scale(0.85).standing().layer(layer::PROP + 3));

    l.decor.push(Decor::new(S_COOLER, 2675.0, DECK).scale(1.2).standing().layer(layer::PROP + 1));
    l.decor.push(Decor::new(S_CHAIR, 5230.0, DECK).scale(1.15).standing().layer(layer::PROP + 1));
    l.decor.push(Decor::new(S_CHAIR, 6700.0, DECK).scale(1.05).standing().layer(layer::PROP + 1).flip());
    l.decor.push(Decor::new(S_GREEN_BIN, 900.0, 0.0).scale(1.1).standing().layer(layer::PROP));
    scatter_lawn(&mut l, -300.0, 1200.0, 0.0, 0x21, false);
    scatter_lawn(&mut l, 7700.0, 9100.0, 0.0, 0x22, false);

    // The grill, mid-deck. Flare-ups are the hazard.
    l.decor.push(Decor::new(S_BBQ_GRILL, 5680.0, DECK + 10.0).scale(1.25).standing().layer(layer::PROP + 2));

    // --- traps & hazards ---
    l.traps.push(Trap::new(TrapKind::Snap, 820.0, 0.0));
    l.traps.push(Trap::new(TrapKind::Snap, 2080.0, DECK).facing(-1.0));
    l.traps.push(Trap::new(TrapKind::Glue, 2900.0, DECK).no_food());
    l.traps.push(Trap::new(TrapKind::Snap, 4700.0, DECK));
    l.traps.push(Trap::new(TrapKind::Zapper, 5680.0, DECK).rhythm(2.4, 0.0).no_food()); // the grill flare
    l.traps.push(Trap::new(TrapKind::Snap, 6560.0, DECK).facing(-1.0));
    l.traps.push(Trap::new(TrapKind::Snap, 2500.0, 0.0)); // in the crawlspace
    l.traps.push(Trap::new(TrapKind::Snap, 4400.0, 0.0).facing(-1.0));
    l.traps.push(Trap::new(TrapKind::Glue, 6000.0, 0.0).no_food());

    // --- food: the feast ---
    l.pickups.push(Pickup::new(Food::HotDog, 3720.0, TABLE - 90.0).noisy());
    l.pickups.push(Pickup::new(Food::Bacon, 5680.0, DECK - 330.0).noisy()); // on the grill
    l.pickups.push(Pickup::new(Food::Marshmallow, 5680.0, DECK - 480.0));
    l.pickups.push(Pickup::new(Food::Cheese, 2675.0, DECK - 230.0));
    l.pickups.push(Pickup::new(Food::Cookie, 4130.0, TABLE - 70.0).noisy());
    l.pickups.push(Pickup::new(Food::Seed, 5680.0, DECK - 470.0));
    for i in 0..8 {
        l.pickups.push(Pickup::new(Food::Crumb, 1700.0 + i as f32 * 130.0, DECK - 70.0));
    }
    for i in 0..6 {
        l.pickups.push(Pickup::new(Food::Crumb, 2200.0 + i as f32 * 140.0, -70.0));
    }
    for i in 0..5 {
        l.pickups.push(Pickup::new(Food::Crumb, 6300.0 + i as f32 * 150.0, DECK - 400.0));
    }

    // --- Will, working the feast ---
    l.npcs.push(Npc::new(NpcKind::Will, 4900.0, DECK).patrol(3000.0, 6900.0).speed(230.0));
    let mut busy = Npc::new(NpcKind::WillBusy, 2300.0, DECK).facing(1.0);
    busy.cone_range = 700.0;
    l.npcs.push(busy);

    // Line of sight is blocked by the table and the cooler.
    l.blockers.push(rect(3150.0, TABLE - 40.0, 1300.0, 300.0));
    l.blockers.push(rect(2560.0, DECK - 170.0, 230.0, 170.0));
    cover(&mut l, 3150.0, TABLE + 40.0, 1300.0, 260.0, false); // under the tablecloth

    l.checkpoints.push(v2(240.0, 0.0));
    l.checkpoints.push(v2(1700.0, DECK));
    l.checkpoints.push(v2(5050.0, DECK));
    l.checkpoints.push(v2(7500.0, 0.0));
    hedge_goal(&mut l, 8900.0, 0.0);
    l
}

// ---------------------------------------------------------------------------
// 3 -- The Playhouse
// Swings, the yellow wave slide, a rope net, and Popcorn patrolling the lawn.
// ---------------------------------------------------------------------------

fn level_playhouse() -> Level {
    let mut l = Level::new(2, 2, Mood::Afternoon);
    l.bounds = rect(-400.0, -3200.0, 10000.0, 6000.0);
    l.spawn = v2(240.0, 0.0);
    l.loot_required = 3;

    ground(&mut l, -400.0, 9600.0, 0.0, Surface::Grass);

    // --- the playhouse, on stilts ---
    const DECKY: f32 = -900.0;
    block(&mut l, 1900.0, DECKY, 1500.0, 60.0, Surface::Wood);
    l.decor.push(Decor::new(S_PLAYHOUSE_WALL, 2650.0, DECKY - 330.0).size(1480.0, 680.0).layer(layer::BACKDROP + 1));
    l.decor.push(Decor::new(S_PLAYHOUSE_ROOF, 2650.0, DECKY - 740.0).size(1740.0, 240.0).layer(layer::BACKDROP + 2));
    l.decor.push(Decor::new(S_PLAYHOUSE_WINDOW, 2300.0, DECKY - 400.0).scale(1.25).layer(layer::BACKDROP + 3));
    l.decor.push(Decor::new(S_PLAYHOUSE_WINDOW, 3000.0, DECKY - 400.0).scale(1.25).layer(layer::BACKDROP + 3));
    for i in 0..4 {
        let x = 1980.0 + i as f32 * 450.0;
        l.decor.push(Decor::new(S_POST_WOOD, x + 25.0, 0.0).size(62.0, 960.0).standing().shade(0.75).layer(layer::BACKDROP));
    }
    cover(&mut l, 1900.0, DECKY + 70.0, 1500.0, 800.0, false); // under the playhouse
    l.decor.push(
        Decor::new(S_WHITE, 2650.0, DECKY + 480.0)
            .size(1540.0, 880.0)
            .tint(0.20, 0.17, 0.14)
            .layer(layer::MID + 6),
    );

    // Ladder up the right-hand side.
    l.climbs.push(rect(3300.0, DECKY, 120.0, 960.0));
    for i in 0..9 {
        l.decor.push(
            Decor::new(S_LADDER_RUNG, 3360.0, -80.0 - i as f32 * 100.0)
                .size(150.0, 26.0)
                .layer(layer::PROP + 1),
        );
    }
    l.decor.push(Decor::new(S_POST_WOOD, 3290.0, 0.0).size(36.0, 960.0).standing().layer(layer::PROP));
    l.decor.push(Decor::new(S_POST_WOOD, 3440.0, 0.0).size(36.0, 960.0).standing().layer(layer::PROP));

    // --- the yellow slide, running down to the left ---
    l.decor.push(Decor::new(S_SLIDE, 1480.0, DECKY + 290.0).size(960.0, 620.0).layer(layer::PROP + 2).flip());
    // Approximated with a staircase of thin one-way steps.
    for i in 0..9 {
        let t = i as f32 / 8.0;
        let x = 1950.0 - t * 880.0;
        let y = DECKY + 40.0 + t * t * 820.0;
        plat(&mut l, x - 70.0, y, 150.0, Surface::Plastic);
    }

    // --- swing set ---
    const BEAM: f32 = -1150.0;
    l.decor.push(Decor::new(S_BEAM_WOOD, 5300.0, BEAM).size(2600.0, 56.0).layer(layer::PROP));
    l.decor.push(Decor::new(S_POST_WOOD, 4080.0, 0.0).size(56.0, 1200.0).standing().layer(layer::PROP));
    l.decor.push(Decor::new(S_POST_WOOD, 6520.0, 0.0).size(56.0, 1200.0).standing().layer(layer::PROP));
    // Diagonal braces.
    l.decor.push(Decor::new(S_POST_WOOD, 4320.0, -600.0).size(44.0, 1300.0).rot(0.36).layer(layer::PROP));
    l.decor.push(Decor::new(S_POST_WOOD, 6280.0, -600.0).size(44.0, 1300.0).rot(-0.36).layer(layer::PROP));

    for i in 0..3 {
        let x = 4600.0 + i as f32 * 620.0;
        let m = l.movers.len();
        l.movers.push(Mover::swing(x, BEAM, 620.0, 0.56, 2.6 + i as f32 * 0.22, i as f32 * 0.37));
        l.solids
            .push(Solid::new(x - 80.0, BEAM + 600.0, 160.0, 26.0, Surface::Plastic).thru().on(m));
    }

    // --- rope net ---
    l.climbs.push(rect(7100.0, -1100.0, 420.0, 1120.0));
    l.decor.push(Decor::new(S_ROPE_NET, 7310.0, -550.0).size(440.0, 1120.0).layer(layer::PROP));
    l.decor.push(Decor::new(S_BEAM_WOOD, 7310.0, -1130.0).size(560.0, 48.0).layer(layer::PROP + 1));
    l.decor.push(Decor::new(S_POST_WOOD, 7070.0, 0.0).size(50.0, 1180.0).standing().layer(layer::PROP));
    l.decor.push(Decor::new(S_POST_WOOD, 7550.0, 0.0).size(50.0, 1180.0).standing().layer(layer::PROP));
    plat(&mut l, 7060.0, -1110.0, 520.0, Surface::Wood);

    // Landing platforms after the net.
    plat(&mut l, 7800.0, -620.0, 260.0, Surface::Wood);
    plat(&mut l, 8260.0, -400.0, 260.0, Surface::Wood);
    plat(&mut l, 8700.0, -200.0, 260.0, Surface::Wood);

    // --- backdrop ---
    house(&mut l, -900.0, 1200.0, 60.0, 0.3, false);
    house(&mut l, 8200.0, 10400.0, 60.0, 0.28, false);
    fence_run(&mut l, 900.0, 9400.0, -30.0, 0.52, 0.92, 360.0);
    tree(&mut l, 700.0, -30.0, 1.3, 0.36, 0.86, true);
    tree(&mut l, 3900.0, -30.0, 1.55, 0.33, 0.82, true);
    tree(&mut l, 6900.0, -30.0, 1.2, 0.4, 0.88, true);
    tree(&mut l, 9100.0, -30.0, 1.45, 0.37, 0.85, true);
    for i in 0..9 {
        l.decor.push(
            Decor::new(if i % 2 == 0 { S_CLOUD_A } else { S_CLOUD_B }, -100.0 + i as f32 * 1150.0, -1500.0 - hash_f(i, 0x61) * 500.0)
                .scale(1.5 + hash_f(i, 0xa1) * 0.8)
                .par(0.12)
                .alpha(0.88)
                .layer(layer::SKY + 1),
        );
    }
    scatter_lawn(&mut l, -300.0, 9400.0, 0.0, 0x31, true);
    l.decor.push(Decor::new(S_TARP, 8700.0, 0.0).scale(1.15).standing().layer(layer::MID + 3).shade(0.94));
    l.decor.push(Decor::new(S_LOG_STACK, 8450.0, 0.0).scale(0.9).standing().layer(layer::PROP).shade(0.96));
    l.decor.push(Decor::new(S_CHAIR, 9200.0, 0.0).scale(1.0).standing().layer(layer::PROP));
    // The picnic blanket with the carved pumpkins.
    l.decor.push(Decor::new(S_GINGHAM, 1150.0, -14.0).size(900.0, 120.0).rot(0.015).layer(layer::GROUND + 3));
    l.decor.push(Decor::new(S_PUMPKIN_CARVED, 900.0, 0.0).scale(0.6).standing().layer(layer::PROP));
    l.decor.push(Decor::new(S_PUMPKIN_CARVED, 1180.0, 0.0).scale(0.56).standing().layer(layer::PROP).flip());
    l.decor.push(Decor::new(S_PUMPKIN, 1420.0, 0.0).scale(0.52).standing().layer(layer::PROP));
    l.decor.push(Decor::new(S_BUCKET_SWING, 5850.0, -700.0).scale(0.9).layer(layer::PROP + 1));

    // --- traps ---
    l.traps.push(Trap::new(TrapKind::Snap, 760.0, 0.0));
    l.traps.push(Trap::new(TrapKind::Snap, 2550.0, 0.0).facing(-1.0));
    l.traps.push(Trap::new(TrapKind::Glue, 3000.0, 0.0).no_food());
    l.traps.push(Trap::new(TrapKind::Snap, 2450.0, DECKY));
    l.traps.push(Trap::new(TrapKind::Bucket, 4350.0, -1100.0).no_food());
    l.traps.push(Trap::new(TrapKind::Snap, 5100.0, 0.0));
    l.traps.push(Trap::new(TrapKind::Glue, 6200.0, 0.0).no_food());
    l.traps.push(Trap::new(TrapKind::Snap, 6900.0, 0.0).facing(-1.0));
    l.traps.push(Trap::new(TrapKind::Snap, 8800.0, -200.0));

    // --- the kids' snacks ---
    l.pickups.push(Pickup::new(Food::Chips, 2650.0, DECKY - 90.0).noisy());
    l.pickups.push(Pickup::new(Food::Juice, 3080.0, DECKY - 90.0).noisy());
    l.pickups.push(Pickup::new(Food::Cookie, 1150.0, -80.0).noisy());
    l.pickups.push(Pickup::new(Food::Cheese, 5850.0, -620.0));
    l.pickups.push(Pickup::new(Food::Marshmallow, 7310.0, -1180.0));
    l.pickups.push(Pickup::new(Food::Seed, 1500.0, -620.0));
    l.pickups.push(Pickup::new(Food::Bacon, 8780.0, -330.0));
    for i in 0..8 {
        l.pickups.push(Pickup::new(Food::Crumb, 400.0 + i as f32 * 120.0, -80.0));
    }
    for i in 0..6 {
        l.pickups.push(Pickup::new(Food::Crumb, 2000.0 + i as f32 * 130.0, DECKY - 80.0));
    }
    for i in 0..7 {
        let t = i as f32 / 6.0;
        l.pickups.push(Pickup::new(Food::Crumb, 1900.0 - t * 830.0, DECKY - 40.0 + t * t * 800.0));
    }
    for i in 0..5 {
        l.pickups.push(Pickup::new(Food::Crumb, 4620.0 + i as f32 * 300.0, -620.0));
    }

    // --- Popcorn, working the lawn ---
    l.npcs.push(Npc::new(NpcKind::Popcorn, 4500.0, 0.0).patrol(3700.0, 6800.0).speed(340.0));
    l.npcs.push(Npc::new(NpcKind::Popcorn, 1300.0, 0.0).patrol(600.0, 1900.0).speed(290.0));
    let mut busy = Npc::new(NpcKind::WillBusy, 8300.0, 0.0).facing(-1.0);
    busy.cone_range = 900.0;
    l.npcs.push(busy);

    l.blockers.push(rect(1900.0, DECKY - 700.0, 1500.0, 700.0));
    l.blockers.push(rect(8420.0, -300.0, 480.0, 300.0));

    l.checkpoints.push(v2(240.0, 0.0));
    l.checkpoints.push(v2(2100.0, DECKY));
    l.checkpoints.push(v2(4200.0, 0.0));
    l.checkpoints.push(v2(7200.0, -1110.0));
    hedge_goal(&mut l, 9550.0, 0.0);
    l
}

// ---------------------------------------------------------------------------
// 4 -- Under the Hutch
// Pitch dark, low beams, baited traps, and a flashlight sweeping the gaps.
// Here you steal the bait rather than trip the trap -- and stay unseen.
// ---------------------------------------------------------------------------

fn level_hutch() -> Level {
    let mut l = Level::new(3, 3, Mood::Underside);
    l.bounds = rect(-400.0, -1800.0, 8200.0, 3600.0);
    l.spawn = v2(240.0, 0.0);
    l.loot_required = 4;

    ground(&mut l, -400.0, 7800.0, 0.0, Surface::Dirt);
    // The hutch floor overhead -- a hard ceiling that keeps the rat low.
    block(&mut l, -400.0, -620.0, 8200.0, 200.0, Surface::Hidden);
    for i in 0..40 {
        let x = -400.0 + i as f32 * 205.0;
        l.decor.push(Decor::new(S_HUTCH_BEAM, x + 100.0, -520.0).size(210.0, 70.0).shade(0.75).layer(layer::GROUND));
        l.decor.push(Decor::new(S_HUTCH_BEAM, x + 100.0, -600.0).size(210.0, 90.0).shade(0.5).layer(layer::GROUND));
    }
    // Support posts, which also block the light.
    for i in 0..13 {
        let x = 400.0 + i as f32 * 600.0;
        // Not solid: the rat squeezes past. It still breaks the flashlight beam.
        l.blockers.push(rect(x, -420.0, 56.0, 420.0));
        l.decor.push(Decor::new(S_POST_WOOD, x + 28.0, 0.0).size(68.0, 440.0).standing().shade(0.8).layer(layer::PROP));
    }

    // Crates, logs and pipework to climb over.
    for &(x, w, h) in &[
        (1120.0, 220.0, 190.0),
        (2340.0, 260.0, 150.0),
        (3550.0, 200.0, 230.0),
        (4780.0, 300.0, 170.0),
        (6050.0, 230.0, 200.0),
        (6980.0, 260.0, 160.0),
    ] {
        block(&mut l, x, -h, w, h, Surface::Wood);
        l.decor.push(Decor::new(S_CRATE, x + w * 0.5, 0.0).size(w + 12.0, h + 10.0).standing().shade(0.9).layer(layer::PROP));
        l.blockers.push(rect(x, -h, w, h));
    }
    for &x in &[1700.0f32, 4100.0, 5500.0] {
        l.decor.push(Decor::new(S_LOG_STACK, x, 0.0).scale(0.7).standing().shade(0.75).layer(layer::BACKDROP + 1));
    }
    l.decor.push(Decor::new(S_PIPE, 2800.0, -470.0).size(900.0, 56.0).shade(0.8).layer(layer::PROP));
    l.decor.push(Decor::new(S_PIPE, 5900.0, -470.0).size(1100.0, 56.0).shade(0.8).layer(layer::PROP));
    for &x in &[900.0f32, 2600.0, 4400.0, 6400.0] {
        l.decor.push(Decor::new(S_COBWEB, x, -580.0).scale(0.9).alpha(0.5).layer(layer::FRONT_PROP));
    }
    l.decor.push(Decor::new(S_MOUSE_HOLE, 120.0, 0.0).scale(1.1).standing().layer(layer::BACKDROP));

    // --- the baited traps: the whole point of this level ---
    // Crouch beside one and press the action key to lift the bait safely.
    let bait_spots: [(f32, f32); 7] = [
        (760.0, 0.0),
        (1760.0, 0.0),
        (2700.0, 0.0),
        (3400.0, 0.0),
        (4500.0, 0.0),
        (5380.0, 0.0),
        (6500.0, 0.0),
    ];
    for (i, &(x, y)) in bait_spots.iter().enumerate() {
        let kind = if i % 3 == 2 { TrapKind::Bait } else { TrapKind::Snap };
        l.traps.push(Trap::new(kind, x, y).facing(if i % 2 == 0 { 1.0 } else { -1.0 }));
        let food = match i % 4 {
            0 => Food::Cheese,
            1 => Food::Bacon,
            2 => Food::Marshmallow,
            _ => Food::Cookie,
        };
        let idx = l.traps.len() - 1;
        let bp = l.traps[idx].bait_pos();
        l.pickups.push(Pickup::new(food, bp.x, bp.y).on_trap(idx));
    }
    // Pure hazards, no reward.
    l.traps.push(Trap::new(TrapKind::Glue, 2050.0, 0.0).no_food());
    l.traps.push(Trap::new(TrapKind::Glue, 5900.0, 0.0).no_food());
    l.traps.push(Trap::new(TrapKind::Zapper, 3900.0, 0.0).rhythm(2.0, 0.3).no_food());
    l.traps.push(Trap::new(TrapKind::Zapper, 6800.0, 0.0).rhythm(1.7, 0.6).no_food());

    for i in 0..10 {
        l.pickups.push(Pickup::new(Food::Crumb, 400.0 + i as f32 * 220.0, -60.0));
    }
    for i in 0..8 {
        l.pickups.push(Pickup::new(Food::Crumb, 4700.0 + i as f32 * 240.0, -60.0));
    }
    l.pickups.push(Pickup::new(Food::Seed, 3650.0, -300.0));

    // --- Will, sweeping a flashlight through the gaps between the boards ---
    for (i, &x) in [1400.0f32, 3100.0, 4900.0, 6700.0].iter().enumerate() {
        let mut n = Npc::new(NpcKind::WillLight, x, -620.0);
        n.state_t = i as f32 * 1.3;
        n.cone_range = 1000.0;
        n.cone_half = 0.2;
        n.facing = if i % 2 == 0 { 1.0 } else { -1.0 };
        l.npcs.push(n);
    }

    // Crates and posts double as hiding places.
    cover(&mut l, 1120.0, -200.0, 240.0, 200.0, true);
    cover(&mut l, 3550.0, -240.0, 220.0, 240.0, true);
    cover(&mut l, 4780.0, -180.0, 320.0, 180.0, true);
    cover(&mut l, 6050.0, -210.0, 250.0, 210.0, true);

    l.checkpoints.push(v2(240.0, 0.0));
    l.checkpoints.push(v2(2200.0, 0.0));
    l.checkpoints.push(v2(4300.0, 0.0));
    l.checkpoints.push(v2(6200.0, 0.0));

    // The way out: daylight at the end of the crawlspace.
    hedge_goal(&mut l, 7550.0, 0.0);
    l
}

// ---------------------------------------------------------------------------
// 5 -- Night Run
// Everything at once, in the dark, with Will and Popcorn both hunting.
// ---------------------------------------------------------------------------

fn level_night_run() -> Level {
    let mut l = Level::new(4, 4, Mood::Night);
    l.bounds = rect(-400.0, -3000.0, 11000.0, 5800.0);
    l.spawn = v2(240.0, 0.0);
    l.loot_required = 3;
    l.dark = 0.52;

    ground(&mut l, -400.0, 2600.0, 0.0, Surface::Grass);
    ground(&mut l, 2900.0, 5200.0, -220.0, Surface::Deck);
    ground(&mut l, 5500.0, 7600.0, 0.0, Surface::Grass);
    ground(&mut l, 7900.0, 10600.0, -160.0, Surface::Grass);

    // Gaps bridged by moving platforms.
    let m0 = l.movers.len();
    l.movers.push(Mover::shuttle(2700.0, -300.0, 0.0, 200.0, 2.4, 0.0));
    l.solids.push(Solid::new(2620.0, -300.0, 200.0, 26.0, Surface::Wood).thru().on(m0));

    let m1 = l.movers.len();
    l.movers.push(Mover::shuttle(5350.0, -420.0, 160.0, 0.0, 3.0, 0.25));
    l.solids.push(Solid::new(5250.0, -420.0, 210.0, 26.0, Surface::Wood).thru().on(m1));

    let m2 = l.movers.len();
    l.movers.push(Mover::bob(7750.0, -340.0, 170.0, 2.2, 0.5));
    l.solids.push(Solid::new(7650.0, -340.0, 210.0, 26.0, Surface::Wood).thru().on(m2));

    // Two swings over the final stretch.
    for i in 0..2 {
        let x = 8700.0 + i as f32 * 620.0;
        let m = l.movers.len();
        l.movers.push(Mover::swing(x, -1250.0, 880.0, 0.5, 2.5, i as f32 * 0.5));
        l.solids
            .push(Solid::new(x - 80.0, -1250.0 + 880.0, 160.0, 26.0, Surface::Plastic).thru().on(m));
        l.decor.push(Decor::new(S_BEAM_WOOD, x, -1270.0).size(760.0, 52.0).shade(0.7).layer(layer::PROP));
        l.decor.push(Decor::new(S_POST_WOOD, x - 340.0, -160.0).size(52.0, 1130.0).standing().shade(0.7).layer(layer::PROP));
    }

    plat(&mut l, 1200.0, -200.0, 240.0, Surface::Wood);
    plat(&mut l, 1700.0, -400.0, 240.0, Surface::Wood);
    plat(&mut l, 3600.0, -420.0, 300.0, Surface::Wood);
    plat(&mut l, 4200.0, -620.0, 280.0, Surface::Wood);
    plat(&mut l, 6100.0, -200.0, 260.0, Surface::Wood);
    plat(&mut l, 6600.0, -400.0, 260.0, Surface::Wood);
    plat(&mut l, 10000.0, -350.0, 280.0, Surface::Wood);

    // --- backdrop ---
    house(&mut l, -900.0, 1400.0, 60.0, 0.3, true);
    house(&mut l, 9200.0, 11600.0, -100.0, 0.27, true);
    fence_run(&mut l, 1300.0, 11000.0, -30.0, 0.5, 0.62, 370.0);
    tree(&mut l, 800.0, -30.0, 1.3, 0.36, 0.5, true);
    tree(&mut l, 4600.0, -250.0, 1.5, 0.33, 0.46, true);
    tree(&mut l, 8200.0, -190.0, 1.35, 0.38, 0.5, true);
    l.decor.push(Decor::new(S_MOON, 1600.0, -1500.0).scale(2.6).par(0.06).layer(layer::SKY + 1));
    for i in 0..40 {
        let x = -200.0 + hash_f(i, 0x7c1) * 11000.0;
        let y = -2400.0 + hash_f(i, 0x3b2) * 1500.0;
        l.decor.push(
            Decor::new(S_GLOW, x, y)
                .scale(0.1 + hash_f(i, 0x9d) * 0.14)
                .par(0.05)
                .alpha(0.5 + hash_f(i, 0x2e) * 0.5)
                .layer(layer::SKY + 2),
        );
    }
    scatter_lawn(&mut l, -300.0, 2500.0, 0.0, 0x41, true);
    scatter_lawn(&mut l, 5600.0, 7500.0, 0.0, 0x42, true);
    scatter_lawn(&mut l, 8000.0, 10500.0, -160.0, 0x43, true);

    // Deck section furniture.
    for i in 0..12 {
        l.decor.push(Decor::new(S_DECK_PLANK, 2950.0 + i as f32 * 192.0, -192.0).size(194.0, 58.0).layer(layer::GROUND));
    }
    l.decor.push(Decor::new(S_BBQ_GRILL, 4100.0, -210.0).scale(1.1).standing().layer(layer::PROP + 1));
    l.decor.push(Decor::new(S_COOLER, 3300.0, -220.0).scale(1.0).standing().layer(layer::PROP + 1));
    l.decor.push(Decor::new(S_GREEN_BIN, 6900.0, 0.0).scale(1.05).standing().layer(layer::PROP));
    l.decor.push(Decor::new(S_TARP, 9800.0, -160.0).scale(1.0).standing().layer(layer::MID + 2).shade(0.6));

    // --- traps ---
    l.traps.push(Trap::new(TrapKind::Snap, 900.0, 0.0));
    l.traps.push(Trap::new(TrapKind::Glue, 1500.0, 0.0).no_food());
    l.traps.push(Trap::new(TrapKind::Snap, 2200.0, 0.0).facing(-1.0));
    l.traps.push(Trap::new(TrapKind::Zapper, 3300.0, -220.0).rhythm(1.8, 0.0).no_food());
    l.traps.push(Trap::new(TrapKind::Snap, 4100.0, -220.0));
    l.traps.push(Trap::new(TrapKind::Zapper, 4800.0, -220.0).rhythm(2.1, 0.4).no_food());
    l.traps.push(Trap::new(TrapKind::Bucket, 5900.0, -900.0).no_food());
    l.traps.push(Trap::new(TrapKind::Snap, 6400.0, 0.0).facing(-1.0));
    l.traps.push(Trap::new(TrapKind::Glue, 7200.0, 0.0).no_food());
    l.traps.push(Trap::new(TrapKind::Snap, 8300.0, -160.0));
    l.traps.push(Trap::new(TrapKind::Zapper, 9600.0, -160.0).rhythm(1.6, 0.2).no_food());

    // --- food ---
    l.pickups.push(Pickup::new(Food::Bacon, 1800.0, -530.0));
    l.pickups.push(Pickup::new(Food::HotDog, 4300.0, -700.0).noisy());
    l.pickups.push(Pickup::new(Food::Cheese, 4420.0, -700.0));
    l.pickups.push(Pickup::new(Food::Marshmallow, 6700.0, -500.0));
    l.pickups.push(Pickup::new(Food::Cookie, 10120.0, -450.0).noisy());
    l.pickups.push(Pickup::new(Food::Seed, 1300.0, -280.0));
    l.pickups.push(Pickup::new(Food::Seed, 8720.0, -440.0));
    for i in 0..9 {
        l.pickups.push(Pickup::new(Food::Crumb, 300.0 + i as f32 * 150.0, -70.0));
    }
    for i in 0..7 {
        l.pickups.push(Pickup::new(Food::Crumb, 3000.0 + i as f32 * 160.0, -290.0));
    }
    for i in 0..7 {
        l.pickups.push(Pickup::new(Food::Crumb, 5600.0 + i as f32 * 170.0, -70.0));
    }
    for i in 0..6 {
        l.pickups.push(Pickup::new(Food::Crumb, 8000.0 + i as f32 * 180.0, -230.0));
    }

    // --- the hunt ---
    l.npcs.push(Npc::new(NpcKind::Will, 3900.0, -220.0).patrol(3000.0, 5100.0).speed(250.0));
    l.npcs.push(Npc::new(NpcKind::Popcorn, 6300.0, 0.0).patrol(5600.0, 7500.0).speed(380.0));
    l.npcs.push(Npc::new(NpcKind::Popcorn, 9200.0, -160.0).patrol(8000.0, 10400.0).speed(400.0));
    let mut w = Npc::new(NpcKind::Will, 1600.0, 0.0).patrol(700.0, 2400.0).speed(215.0);
    w.cone_range = 820.0;
    l.npcs.push(w);

    l.blockers.push(rect(3300.0, -400.0, 200.0, 180.0));
    l.blockers.push(rect(9700.0, -500.0, 340.0, 340.0));
    cover(&mut l, 9700.0, -500.0, 360.0, 340.0, true);
    cover(&mut l, 6850.0, -230.0, 240.0, 230.0, true);

    l.checkpoints.push(v2(240.0, 0.0));
    l.checkpoints.push(v2(2950.0, -220.0));
    l.checkpoints.push(v2(5600.0, 0.0));
    l.checkpoints.push(v2(8000.0, -160.0));
    hedge_goal(&mut l, 10650.0, -160.0);
    l
}

pub fn build(index: usize) -> Level {
    match index {
        0 => level_back_lawn(),
        1 => level_deck_feast(),
        2 => level_playhouse(),
        3 => level_hutch(),
        _ => level_night_run(),
    }
}
