import api from './api';
import { offlineStorage } from './offlineStorage';

export const syncManager = {
  isSyncing: false,

  sync: async () => {
    if (syncManager.isSyncing) return;
    if (!navigator.onLine) return;

    const pending = await offlineStorage.getPendingChanges();
    if (pending.length === 0) return;

    syncManager.isSyncing = true;
    console.log(`Iniciando sincronización de ${pending.length} cambios...`);

    try {
      // Agrupar cambios para enviarlos en un solo lote
      const response = await api.post('/sync', { changes: pending });
      
      if (response.data && response.data.results) {
        // Limpiar la cola localmente
        const idsToRemove = pending.map(p => p.id);
        await offlineStorage.clearProcessedChanges(idsToRemove);
        
        // Marcar registros como sincronizados según la entidad
        for (const res of response.data.results) {
          if (res.status === 'success' || res.status === 'updated') {
            // Determinar la tabla correcta a partir del cambio pendiente correspondiente
            const change = pending.find(p => p.entity_id === res.localId);
            if (change) {
              const table = change.entity_type === 'neighborhood'
                ? 'neighborhoods'
                : change.entity_type === 'house'
                  ? 'houses'
                  : 'blocks';
              await offlineStorage.markSynced(table, res.localId);
            }
          }
        }
        console.log('Sincronización exitosa.');
      }
    } catch (err) {
      console.error('Error durante la sincronización:', err);
    } finally {
      syncManager.isSyncing = false;
    }
  },

  init: () => {
    window.addEventListener('online', syncManager.sync);
    // Intentar cada 30 segundos si estamos online
    setInterval(syncManager.sync, 30000);
  }
};

