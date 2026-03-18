export type CID10 = {
  codigo: string;
  nome: string;
};

export const LISTA_CID10: CID10[] = [
  { codigo: 'A09', nome: 'Diarreia e gastroenterite de origem infecciosa' },
  { codigo: 'B34.9', nome: 'Infecção viral não especificada' },
  { codigo: 'J00', nome: 'Nasofaringite aguda (resfriado comum)' },
  { codigo: 'J01', nome: 'Sinusite aguda' },
  { codigo: 'J02', nome: 'Faringite aguda' },
  { codigo: 'J03', nome: 'Amigdalite aguda' },
  { codigo: 'J06', nome: 'Infecções agudas das vias aéreas superiores múlt. locais' },
  { codigo: 'J06.9', nome: 'Infecção aguda das vias aéreas superiores não especificada' },
  { codigo: 'J11', nome: 'Influenza (gripe)' },
  { codigo: 'J20', nome: 'Bronquite aguda' },
  { codigo: 'J40', nome: 'Bronquite não especificada como aguda ou crônica' },
  { codigo: 'J45', nome: 'Asma' },
  { codigo: 'K21', nome: 'Doença de refluxo gastroesofágico' },
  { codigo: 'K29', nome: 'Gastrite e duodenite' },
  { codigo: 'K29.7', nome: 'Gastrite não especificada' },
  { codigo: 'L03', nome: 'Celulite (infecção de pele)' },
  { codigo: 'M54', nome: 'Dorsalgia (dores nas costas)' },
  { codigo: 'M54.2', nome: 'Cervicalgia' },
  { codigo: 'M54.5', nome: 'Dor lombar baixa' },
  { codigo: 'M79.1', nome: 'Mialgia (dor muscular)' },
  { codigo: 'N39.0', nome: 'Infecção do trato urinário não especificada' },
  { codigo: 'R05', nome: 'Tosse' },
  { codigo: 'R06.0', nome: 'Dispneia (falta de ar)' },
  { codigo: 'R07', nome: 'Dor na garganta e no peito' },
  { codigo: 'R10', nome: 'Dor abdominal e pélvica' },
  { codigo: 'R11', nome: 'Náusea e vômitos' },
  { codigo: 'R42', nome: 'Tontura e instabilidade' },
  { codigo: 'R50', nome: 'Febre de origem desconhecida' },
  { codigo: 'R50.9', nome: 'Febre não especificada' },
  { codigo: 'R51', nome: 'Cefaleia (dor de cabeça)' },
  { codigo: 'R52', nome: 'Dor não especificada em outros locais' },
  { codigo: 'Z00', nome: 'Exame geral e investigação de pessoas sem queixas' },
  { codigo: 'Z02.7', nome: 'Obtenção de atestado médico' },
  { codigo: 'Z76.5', nome: 'Pessoa fingindo ser doente (simulação)' },
  { codigo: 'B00', nome: 'Infecções pelo vírus do herpes simples' },
  { codigo: 'B01', nome: 'Varicela (catapora)' },
  { codigo: 'B02', nome: 'Herpes zoster' },
  { codigo: 'G43', nome: 'Enxaqueca' },
  { codigo: 'H10', nome: 'Conjuntivite' },
  { codigo: 'H66', nome: 'Otite média não supurativa' },
  { codigo: 'I10', nome: 'Hipertensão essencial (primária)' },
  { codigo: 'K59.0', nome: 'Constipação' },
  { codigo: 'L20', nome: 'Dermatite atópica' },
  { codigo: 'L70', nome: 'Acne' },
  { codigo: 'N64.4', nome: 'Mastodinia (dor nas mamas)' },
  { codigo: 'N94.6', nome: 'Dismenorreia não especificada (cólica)' },
  { codigo: 'R21', nome: 'Erupção cutânea e outras alterações cutâneas' },
  { codigo: 'R30', nome: 'Dor associada à micção' },
  { codigo: 'S00', nome: 'Traumatismo superficial da cabeça' },
  { codigo: 'S60', nome: 'Traumatismo superficial do punho e da mão' },
  { codigo: 'S90', nome: 'Traumatismo superficial do tornozelo e do pé' },
];

export function buscarCID(termo: string): CID10[] {
  const t = termo.toLowerCase().trim();
  if (!t) return [];
  
  return LISTA_CID10.filter(cid => 
    cid.codigo.toLowerCase().includes(t) || 
    cid.nome.toLowerCase().includes(t)
  ).slice(0, 10); // Limitar a 10 sugestões para performance e UI
}
