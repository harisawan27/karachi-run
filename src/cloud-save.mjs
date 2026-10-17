/** Store the whole validated progression as one row owned by the signed-in player. */
export function createPlayerSaveStore(client) {
  return {
    async load(userId) {
      const { data, error } = await client.from('player_saves').select('save_data').eq('user_id', userId).limit(1);
      if (error) throw new Error(`Cloud load failed: ${error.message} (${error.code || 'network'})`);
      return data?.[0]?.save_data ?? null;
    },
    async write(userId, save) {
      const { data, error } = await client.from('player_saves').upsert(
        { user_id: userId, save_data: save, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      ).select('user_id,updated_at');
      if (error) throw new Error(`Cloud save failed: ${error.message} (${error.code || 'network'})`);
      if (data?.length !== 1 || data[0].user_id !== userId) throw new Error('The database did not confirm your cloud save. Check the player_saves permissions.');
    },
  };
}
