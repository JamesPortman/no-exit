// Team chat: a message reaches the sender's teammates and the host, never
// another team, and rides the state poll incrementally.
import { describe, it, expect } from 'vitest';
const {
  create, join, host, chat, call, get, state, soloRun, playerState, hostState,
} = require('./helpers.js');

// Two players on Red, one on Blue.
async function threePlayerGame() {
  const created = await call(create, {
    body: { adventureSlug: 'test-adventure', teams: ['Red', 'Blue'] },
  });
  const { code, hostToken, teams } = created.body;
  const add = async (name, teamId) =>
    (await call(join, { body: { code, name, teamId } })).body;
  const alice = await add('Alice', teams[0].id);
  const carol = await add('Carol', teams[0].id);
  const bob = await add('Bob', teams[1].id);
  return { code, hostToken, teams, alice, carol, bob };
}

const say = (code, p, text) => call(chat, { body: { code, ...p, text } });

describe('team chat', () => {
  it('reaches teammates and the host, but not the other team', async () => {
    const { code, hostToken, teams, alice, carol, bob } = await threePlayerGame();
    expect((await say(code, alice, 'try the clock first')).statusCode).toBe(200);

    const c = await playerState(code, carol);
    expect(c.body.chat).toHaveLength(1);
    expect(c.body.chat[0]).toMatchObject({ name: 'Alice', text: 'try the clock first', mine: false });
    // The sender's player id never leaves the server.
    expect(JSON.stringify(c.body.chat)).not.toContain(alice.playerId);

    const a = await playerState(code, alice);
    expect(a.body.chat[0].mine).toBe(true);

    const b = await playerState(code, bob);
    expect(b.body.chat).toEqual([]);

    const h = await hostState(code, hostToken);
    const red = h.body.host.teams.find((t) => t.id === teams[0].id);
    const blue = h.body.host.teams.find((t) => t.id === teams[1].id);
    expect(red.chat.map((m) => m.text)).toEqual(['try the clock first']);
    expect(blue.chat).toEqual([]);
  });

  it('works in the lobby, before the game starts', async () => {
    const { code, alice, carol } = await threePlayerGame();
    await say(code, alice, 'hi team');
    expect((await playerState(code, carol)).body.chat[0].text).toBe('hi team');
  });

  it('returns only messages after chatAfter', async () => {
    const { code, alice, carol } = await threePlayerGame();
    await say(code, alice, 'one');
    await say(code, carol, 'two');
    await say(code, alice, 'three');
    const all = (await playerState(code, carol)).body.chat;
    expect(all.map((m) => m.text)).toEqual(['one', 'two', 'three']);
    const newer = await get(state, {
      code, playerId: carol.playerId, token: carol.token, chatAfter: String(all[0].seq),
    });
    expect(newer.body.chat.map((m) => m.text)).toEqual(['two', 'three']);
  });

  it('rejects empty messages, strangers and solo runs; clamps long ones', async () => {
    const { code, alice, bob, hostToken } = await threePlayerGame();
    expect((await say(code, alice, '   ')).statusCode).toBe(400);
    expect((await say(code, { ...alice, token: bob.token }, 'hi')).statusCode).toBe(403);
    // The host token is not a player credential.
    expect((await call(chat, { body: { code, hostToken, text: 'hi' } })).statusCode).toBe(403);

    await say(code, alice, 'x'.repeat(1000));
    const s = await playerState(code, alice);
    expect(s.body.chat[0].text).toHaveLength(300);

    const run = await soloRun({ name: 'Solo' });
    const r = await call(chat, {
      body: { code: run.code, playerId: run.playerId, token: run.token, text: 'hello?' },
    });
    expect(r.statusCode).toBe(400);
  });

  it('a kicked player can no longer post', async () => {
    const { code, hostToken, alice } = await threePlayerGame();
    await call(host, { body: { code, hostToken, action: 'kick', playerId: alice.playerId } });
    expect((await say(code, alice, 'still here?')).statusCode).toBe(403);
  });
});
