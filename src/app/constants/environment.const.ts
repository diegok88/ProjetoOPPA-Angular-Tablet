// Aplicado a rede de casa.
const API_HOST_FISICO = '192.168.1.5';
const API_HOST_EMULADOR = '10.0.2.2';

// Troque para true apenas ao usar o emulador Android
const USAR_EMULADOR = false;

const API_HOST = USAR_EMULADOR ? API_HOST_EMULADOR : API_HOST_FISICO;

export const environment = {
  apiUrl: `http://${API_HOST}:3000`,
  wsUrl: `ws://${API_HOST}:3000/ws`,
};
/*

 */

// Aplicado a rede da fag.
// IP atual do Windows na rede Wi-Fi (pegue com ipconfig; muda se o DHCP renovar)

/*
const API_HOST_FISICO = '10.120.5.86';

// Emulador Android: 10.0.2.2 é o alias do loopback do host
const API_HOST_EMULADOR = '10.0.2.2';

// Troque para true apenas ao usar o emulador Android
const USAR_EMULADOR = false;

const API_HOST = USAR_EMULADOR ? API_HOST_EMULADOR : API_HOST_FISICO;

export const environment = {
  apiUrl: `http://${API_HOST}:3000`,
  wsUrl: `ws://${API_HOST}:3000/ws`,
};
*/

// Aplicado a rede de fiasul.

/*
const API_HOST_FISICO = '10.97.13.3';
const API_HOST_EMULADOR = '10.0.2.2';

const USAR_EMULADOR = false;

const API_HOST = USAR_EMULADOR ? API_HOST_EMULADOR : API_HOST_FISICO;

export const environment = {
  apiUrl: `http://${API_HOST}:3000`,
  wsUrl: `ws://${API_HOST}:3000/ws`,
};
 */

// Adaptador de Rede sem Fio Wi-Fi:
