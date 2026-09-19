export interface LobbyParticipant {
  socketId: string;
  userId: string;
  ready?: boolean;
}

/** Solo la conexión autenticada puede cambiar su propia confirmación. */
export function recordLobbyReady(
  participants: LobbyParticipant[],
  socket: { id: string; data: { userId: string } },
  ready: unknown,
): boolean {
  if (typeof ready !== 'boolean')
    throw new Error('Indica si estás listo para jugar.');
  const player = participants.find(
    (p) => p.socketId === socket.id && p.userId === socket.data.userId,
  );
  if (!player) throw new Error('No estás en esta sala.');
  if (Boolean(player.ready) === ready) return false;
  player.ready = ready;
  return true;
}

export function allLobbyReady(
  participants: LobbyParticipant[],
  min = 2,
  max = 2,
  even = false,
): boolean {
  return (
    participants.length >= min &&
    participants.length <= max &&
    (!even || participants.length % 2 === 0) &&
    participants.every((p) => p.ready === true)
  );
}

export function resetLobbyReady(participants: LobbyParticipant[]): void {
  for (const player of participants) player.ready = false;
}
