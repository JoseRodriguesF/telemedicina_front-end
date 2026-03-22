export type CID10 = {
  codigo: string;
  nome: string;
};

// Keep the old list for very basic/common cases if needed, but the new API is much more comprehensive
export const LISTA_CID10_BASICA: CID10[] = [
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
];

/**
 * Searches for CID-10 codes using the new database.
 * This function is now ASYNC as it fetches from the server.
 */
export async function buscarCID(termo: string): Promise<CID10[]> {
  const t = termo.toLowerCase().trim();
  if (t.length < 2) return [];

  try {
    const response = await fetch(`/api/cid10?q=${encodeURIComponent(t)}`);
    if (!response.ok) throw new Error('Falha ao buscar CID');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in buscarCID:', error);
    // Silent fallback to basic list if API fails
    return LISTA_CID10_BASICA.filter(cid => 
      cid.codigo.toLowerCase().includes(t) || 
      cid.nome.toLowerCase().includes(t)
    ).slice(0, 10);
  }
}

