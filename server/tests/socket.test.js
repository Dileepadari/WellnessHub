const { createServer } = require('http');
const jwt = require('jsonwebtoken');
const { io: connect } = require('socket.io-client');

const config = require('../src/config/env');
const { createSocketServer, teamRoom, userRoom } = require('../src/socket');
const Team = require('../src/models/Team');
const User = require('../src/models/User');
const { registerUser } = require('./helpers');

let httpServer;
let io;
let port;

beforeAll(async () => {
  httpServer = createServer();
  io = createSocketServer(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  port = httpServer.address().port;
});

afterAll(async () => {
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
});

const open = (token) =>
  new Promise((resolve, reject) => {
    const socket = connect(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });

/** Resolves once the server has finished handling an emit from this socket. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 120));

describe('socket authentication', () => {
  it('refuses a connection with no token', async () => {
    await expect(open(undefined)).rejects.toThrow(/Authentication required/);
  });

  it('refuses a forged token', async () => {
    const forged = jwt.sign({ id: '507f1f77bcf86cd799439011' }, 'not-the-real-secret');
    await expect(open(forged)).rejects.toThrow(/Invalid token/);
  });
});

describe('join-team', () => {
  const makeTeam = async (type, captainId) =>
    Team.create({
      name: `${type} team`,
      description: 'A team used by the socket room tests.',
      type,
      category: 'wellness',
      creator: captainId,
      members: [{ userId: captainId, status: 'active' }]
    });

  it('lets anyone subscribe to a public team', async () => {
    const owner = await registerUser();
    const outsider = await registerUser({ username: 'outsider1', email: 'o1@example.com' });
    const team = await makeTeam('public', owner.user._id);

    const socket = await open(outsider.token);
    socket.emit('join-team', team._id.toString());
    await settle();

    const members = io.sockets.adapter.rooms.get(teamRoom(team._id));
    expect(members?.has(socket.id)).toBe(true);
    socket.disconnect();
  });

  it('refuses a private team to a non-member', async () => {
    const owner = await registerUser();
    const outsider = await registerUser({ username: 'outsider2', email: 'o2@example.com' });
    const team = await makeTeam('private', owner.user._id);

    const socket = await open(outsider.token);
    socket.emit('join-team', team._id.toString());
    await settle();

    // REST answers 403 for this team. The socket handler joined the room
    // unconditionally, so the same user could watch it anyway.
    expect(io.sockets.adapter.rooms.get(teamRoom(team._id))).toBeUndefined();
    socket.disconnect();
  });

  it('refuses an invite-only team to a non-member', async () => {
    const owner = await registerUser();
    const outsider = await registerUser({ username: 'outsider3', email: 'o3@example.com' });
    const team = await makeTeam('invite-only', owner.user._id);

    const socket = await open(outsider.token);
    socket.emit('join-team', team._id.toString());
    await settle();

    expect(io.sockets.adapter.rooms.get(teamRoom(team._id))).toBeUndefined();
    socket.disconnect();
  });

  it('lets an active member of a private team subscribe', async () => {
    const owner = await registerUser();
    const team = await makeTeam('private', owner.user._id);

    const socket = await open(owner.token);
    socket.emit('join-team', team._id.toString());
    await settle();

    expect(io.sockets.adapter.rooms.get(teamRoom(team._id))?.has(socket.id)).toBe(true);
    socket.disconnect();
  });

  it('ignores a team id that does not exist', async () => {
    const member = await registerUser();

    const socket = await open(member.token);
    socket.emit('join-team', '507f1f77bcf86cd799439011');
    socket.emit('join-team', 'not-an-object-id');
    await settle();

    // Still connected: a bad id is ignored, never a thrown handler.
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });
});

describe('activity-update', () => {
  it('reaches a friend', async () => {
    const sender = await registerUser();
    const friend = await registerUser({ username: 'friend_1', email: 'f1@example.com' });
    await User.findByIdAndUpdate(sender.user._id, { $push: { friends: friend.user._id } });

    const senderSocket = await open(sender.token);
    const friendSocket = await open(friend.token);

    const seen = new Promise((resolve) => friendSocket.on('friend-activity', resolve));
    senderSocket.emit('activity-update', { activity: 'logged a run' });

    await expect(seen).resolves.toMatchObject({ activity: 'logged a run' });
    senderSocket.disconnect();
    friendSocket.disconnect();
  });

  it('does not reach an unrelated user', async () => {
    const sender = await registerUser();
    const stranger = await registerUser({ username: 'stranger1', email: 's1@example.com' });

    const senderSocket = await open(sender.token);
    const strangerSocket = await open(stranger.token);

    const received = [];
    strangerSocket.on('friend-activity', (p) => received.push(p));

    senderSocket.emit('activity-update', { activity: 'weighed in at 78kg' });
    await settle();

    // socket.broadcast.emit went to every connected socket, so an event named
    // friend-activity was delivered to people who are not friends.
    expect(received).toEqual([]);
    senderSocket.disconnect();
    strangerSocket.disconnect();
  });

  it('attributes the activity to the authenticated user, not the payload', async () => {
    const sender = await registerUser();
    const friend = await registerUser({ username: 'friend_2', email: 'f2@example.com' });
    await User.findByIdAndUpdate(sender.user._id, { $push: { friends: friend.user._id } });

    const senderSocket = await open(sender.token);
    const friendSocket = await open(friend.token);

    const seen = new Promise((resolve) => friendSocket.on('friend-activity', resolve));
    senderSocket.emit('activity-update', {
      activity: 'logged a swim',
      userId: '507f1f77bcf86cd799439011'
    });

    await expect(seen).resolves.toMatchObject({ userId: sender.user._id.toString() });
    senderSocket.disconnect();
    friendSocket.disconnect();
  });
});

describe('room naming', () => {
  it('derives rooms from ids', () => {
    expect(userRoom('abc')).toBe('user-abc');
    expect(teamRoom('xyz')).toBe('team-xyz');
  });
});

describe('config', () => {
  it('uses the test secret', () => {
    expect(config.jwtSecret).toBe('test-secret-not-used-anywhere-real');
  });
});
