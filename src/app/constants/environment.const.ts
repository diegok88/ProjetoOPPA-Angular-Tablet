// Adaptador de Rede sem Fio Wi-Fi:

const API_HOST_FISICO = '10.97.5.135';
const API_HOST_EMULADOR = '10.0.2.2';

// Troque para true apenas ao usar o emulador Android
const USAR_EMULADOR = false;

const API_HOST = USAR_EMULADOR ? API_HOST_EMULADOR : API_HOST_FISICO;

export const environment = {
  apiUrl: `http://${API_HOST}:3000`,
  wsUrl: `ws://${API_HOST}:3000/ws`,
};
