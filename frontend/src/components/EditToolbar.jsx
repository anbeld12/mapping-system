import React from 'react';

const EditToolbar = ({ 
  onSave, 
  onCancel, 
  onDelete, 
  selectedId, 
  entityType 
}) => {
  if (!selectedId) return null;

  return (
    <div className="edit-toolbar">
      <div className="selected-feature-info">
        <strong>Editando {entityType === 'block' ? 'Cuadra' : 'Vivienda'}</strong><br/>
        <small>{selectedId.substring(0, 8)}...</small>
      </div>
      
      <button 
        onClick={onSave}
        style={{ padding: '8px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        💾 Guardar Cambios
      </button>
      
      <button 
        onClick={onDelete}
        style={{ padding: '8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        🗑️ Eliminar
      </button>

      <button 
        onClick={onCancel}
        style={{ padding: '8px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        ❌ Cancelar
      </button>
    </div>
  );
};

export default EditToolbar;
