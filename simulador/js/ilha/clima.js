// Oceano: o clima do mundo vem do processamento da IA (antes vinha do gasto de tokens).
// clima.alvo vai de 0 (seco, só nuvens comuns e uma ou outra de chuva) a 1 (chuva forte).
export const clima = { auto: 0.12, manual: null, get alvo() { return this.manual ?? this.auto; } };
