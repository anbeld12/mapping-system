import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const mapService = {
  fetchMapData: async (bbox) => {
    const response = await api.get(`/map?bbox=${bbox.join(',')}`);
    return response.data;
  },
};

export const blockService = {
  createBlock: async (blockData) => {
    const response = await api.post('/blocks', blockData);
    return response.data;
  },
  fetchBlocks: async (bbox = null) => {
    const url = bbox ? `/blocks?bbox=${bbox.join(',')}` : '/blocks';
    const response = await api.get(url);
    return response.data;
  },
};

export const houseService = {
  fetchHouses: async (bbox = null) => {
    const url = bbox ? `/houses?bbox=${bbox.join(',')}` : '/houses';
    const response = await api.get(url);
    return response.data;
  },
  createHouse: async (houseData) => {
    const response = await api.post('/houses', houseData);
    return response.data;
  }
};

export const neighborhoodService = {
  fetchNeighborhoods: async (bbox) => {
    const params = bbox ? { bbox: bbox.join(',') } : {};
    const response = await api.get('/neighborhoods', { params });
    return response.data;
  },
  createNeighborhood: async (data) => {
    const response = await api.post('/neighborhoods', data);
    return response.data;
  },
  updateNeighborhood: async (id, data) => {
    const response = await api.put(`/neighborhoods/${id}`, data);
    return response.data;
  },
  assignBlocks: async (id, blockIds) => {
    const response = await api.post(`/neighborhoods/${id}/blocks`, { block_ids: blockIds });
    return response.data;
  }
};

export const exportService = {
  exportData: async (params) => {
    const response = await api.get('/export', { 
      params,
      responseType: 'blob' 
    });
    return response.data;
  },
  downloadReport: async () => {
    const response = await api.get('/export/report', { 
      responseType: 'blob' 
    });
    return response.data;
  }
};

export default api;
