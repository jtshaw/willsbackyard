//! Chaos at the Party: the drop and the shriek, driven through the real NPC
//! update so tuning changes can't quietly make the level trivial or unfair.

use crate::level::*;
use crate::levels;
use crate::math::*;
use crate::npc;
use crate::player::Player;

const DT: f32 = 1.0 / 60.0;

fn party() -> Level {
    (0..levels::LEVEL_COUNT)
        .map(levels::build)
        .find(|l| l.party)
        .expect("a party level")
}

/// Runs the guests for `secs` with the rat held at `at`; returns the peak
/// suspicion seen and whether anyone caught it.
fn expose(lvl: &mut Level, at: V2, start: f32, secs: f32) -> (f32, bool) {
    let mut p = Player::new(at);
    let mut peak: f32 = 0.0;
    let mut caught = false;
    let mut t = start;
    lvl.party_t = start;
    for _ in 0..(secs / DT) as i32 {
        p.pos = at;
        let r = npc::update(lvl, &mut p, DT, t, 0);
        peak = peak.max(r.tension);
        caught |= r.caught;
        t += DT;
        lvl.party_t += DT;
    }
    (peak, caught)
}

#[test]
fn guests_spot_a_rat_on_the_snack_table_during_the_build() {
    let mut l = party();
    let (peak, _) = expose(&mut l, v2(4800.0, -330.0), 0.0, 3.0);
    assert!(peak >= 1.0, "the doctor never noticed a rat on her high-top (peak {peak})");
}

#[test]
fn nobody_sees_anything_on_the_drop() {
    let mut l = party();
    let (peak, caught) = expose(&mut l, v2(4800.0, -330.0), PARTY_DROP_AT + 0.1, PARTY_CYCLE - PARTY_DROP_AT - 0.2);
    assert!(peak < 0.05 && !caught, "guests noticed the rat mid-drop (peak {peak})");
}

#[test]
fn a_shriek_brings_the_crowd() {
    let mut l = party();
    // Seen on the high-top...
    expose(&mut l, v2(4800.0, -330.0), 0.0, 1.5);
    let hunting = l
        .npcs
        .iter()
        .filter(|n| n.kind == NpcKind::Guest && n.speed > 0.0 && n.state == NpcState::Chase)
        .count();
    assert!(hunting > 0, "the doctor's shriek brought nobody");
    // ...then down on the floor, where a guest can grab it.
    let (_, caught) = expose(&mut l, v2(4650.0, 0.0), 1.5, 6.0);
    assert!(caught, "the guests came running but never caught the rat");
}
