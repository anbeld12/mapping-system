import Dexie from 'dexie';

export const db = new Dexie('MappingOfflineDB');

db.version(1).stores({
  blocks: 'id, name, synced', // id es UUID
  houses: 'id, block_id, synced',
  neighborhoods: 'id, name, synced',
  pendingChanges: '++id, entity_type, entity_id, operation'
});

export const offlineStorage = {
  // Barrios
  saveNeighborhood: async (neighborhood) => {
    return await db.neighborhoods.put({ ...neighborhood, synced: 0 });
  },
  getNeighborhoods: async () => {
    return await db.neighborhoods.toArray();
  },
  deleteNeighborhood: async (id) => {
    await db.neighborhoods.delete(id);
    // Nota: las cuadras asociadas se mantienen pero pierden la referencia al sincronizar
  },

  // Bloques
  saveBlock: async (block) => {
    return await db.blocks.put({ ...block, synced: 0 });
  },
  getBlocks: async () => {
    return await db.blocks.toArray();
  },
  deleteBlock: async (id) => {
    await db.blocks.delete(id);
    await db.houses.where('block_id').equals(id).delete();
  },

  // Casas
  saveHouses: async (houses) => {
    return await db.houses.bulkPut(houses.map(h => ({ ...h, synced: 0 })));
  },
  getHousesByBlock: async (blockId) => {
    return await db.houses.where('block_id').equals(blockId).toArray();
  },

  // Cambios pendientes
  addPendingChange: async (change) => {
    // change: { entity_type, entity_id, operation, data }
    return await db.pendingChanges.add(change);
  },
  getPendingChanges: async () => {
    return await db.pendingChanges.toArray();
  },
  clearPendingChange: async (id) => {
    return await db.pendingChanges.delete(id);
  },
  
  // Limpiar cambios procesados
  clearProcessedChanges: async (ids) => {
    return await db.pendingChanges.bulkDelete(ids);
  },

  // Marcar un registro como sincronizado con el servidor
  // table: nombre de la tabla Dexie ('blocks', 'houses', 'neighborhoods')
  // id: identificador del registro (UUID string)
  markSynced: async (table, id) => {
    try {
      await db[table].update(id, { synced: 1 });
    } catch (err) {
      console.error(`Error marcando ${table}[${id}] como sincronizado:`, err);
    }
  }
};
