import React, { useState } from 'react';
import { exportService } from '../services/api';

const ExportModal = ({ isOpen, onClose, neighborhoods, currentBbox }) => {
  const [format, setFormat] = useState('geojson');
  const [entities, setEntities] = useState({
    blocks: true,
    houses: true,
    neighborhoods: true
  });
  const [filters, setFilters] = useState({
    neighborhood_ids: [],
    useBbox: false,
    start_date: '',
    end_date: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = {
        format,
        include_blocks: entities.blocks,
        include_houses: entities.houses,
        include_neighborhoods: entities.neighborhoods,
        start_date: filters.start_date,
        end_date: filters.end_date
      };

      if (filters.useBbox && currentBbox) {
        params.bbox = currentBbox.join(',');
      }

      if (filters.neighborhood_ids.length > 0) {
        params.neighborhood_ids = filters.neighborhood_ids.join(',');
      }

      const data = await exportService.exportData(params);
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export.${format === 'csv' ? 'csv' : 'geojson'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Error al exportar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    setLoading(true);
    try {
      const data = await exportService.downloadReport();
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reporte_sistema.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Error al descargar reporte: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '12px',
        width: '450px',
        maxWidth: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{marginTop: 0, color: '#2d3436'}}>Exportar Datos y Reportes</h2>
        
        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Formato:</label>
          <select 
            value={format} 
            onChange={(e) => setFormat(e.target.value)}
            style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd'}}
          >
            <option value="geojson">GeoJSON (.geojson)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </div>

        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Entidades:</label>
          <div style={{display: 'flex', gap: '15px'}}>
            <label><input type="checkbox" checked={entities.blocks} onChange={e => setEntities({...entities, blocks: e.target.checked})} /> Cuadras</label>
            <label><input type="checkbox" checked={entities.houses} onChange={e => setEntities({...entities, houses: e.target.checked})} /> Viviendas</label>
            <label><input type="checkbox" checked={entities.neighborhoods} onChange={e => setEntities({...entities, neighborhoods: e.target.checked})} /> Barrios</label>
          </div>
        </div>

        <div style={{marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px'}}>
          <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Filtros:</label>
          
          <label style={{display: 'block', marginBottom: '10px'}}>
            <input type="checkbox" checked={filters.useBbox} onChange={e => setFilters({...filters, useBbox: e.target.checked})} />
            Exportar solo área actual del mapa
          </label>

          <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>Filtrar por Barrio:</label>
          <select 
            multiple
            value={filters.neighborhood_ids}
            onChange={(e) => setFilters({...filters, neighborhood_ids: Array.from(e.target.selectedOptions, option => option.value)})}
            style={{width: '100%', padding: '5px', height: '80px', borderRadius: '4px', border: '1px solid #ddd'}}
          >
            {neighborhoods.map(nb => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
          </select>
          <small style={{color: '#666'}}>Mantén Ctrl para seleccionar varios.</small>
        </div>

        <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
          <button onClick={onClose} style={{padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white'}}>
            Cancelar
          </button>
          <button 
            onClick={handleReport} 
            style={{padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: '#6c757d', color: 'white'}}
            disabled={loading}
          >
            📊 Reporte PDF
          </button>
          <button 
            onClick={handleExport} 
            style={{padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: '#007bff', color: 'white', fontWeight: 'bold'}}
            disabled={loading}
          >
            {loading ? 'Procesando...' : '📥 Exportar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
