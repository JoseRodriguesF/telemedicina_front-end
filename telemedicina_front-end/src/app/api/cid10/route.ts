import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Memory cache to keep it efficient
let cidCache: any[] | null = null;

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Loads and parses CID-10 data from CSV files.
 * This is done once and cached for subsequent requests.
 */
function getCIDData(): any[] {
  if (cidCache) return cidCache;

  const results: any[] = [];
  const seen = new Set();
  const projectRoot = process.cwd();
  
  const CATEGORIAS_PATH = path.join(projectRoot, 'cid10/CID-10-CATEGORIAS.CSV');
  const SUBCATEGORIAS_PATH = path.join(projectRoot, 'cid10/CID-10-SUBCATEGORIAS.CSV');

  function formatCode(code: string) {
    if (code.length === 4) {
      return code.substring(0, 3) + '.' + code.substring(3);
    }
    return code;
  }

  try {
    // 1. Process Categories (3 digits)
    if (fs.existsSync(CATEGORIAS_PATH)) {
      const catCsv = fs.readFileSync(CATEGORIAS_PATH, 'latin1');
      const catLines = catCsv.split('\n').filter(l => l.trim().length > 0);
      
      for (let i = 1; i < catLines.length; i++) {
        const parts = catLines[i].split(';');
        if (parts.length >= 3) {
          const code = parts[0].trim();
          const description = parts[2].trim();
          if (code && description && !seen.has(code)) {
            results.push({ 
              codigo: code, 
              nome: description,
              nomeNormalizado: removeAccents(description)
            });
            seen.add(code);
          }
        }
      }
    }

    // 2. Process Subcategories (4 digits)
    if (fs.existsSync(SUBCATEGORIAS_PATH)) {
      const subCatCsv = fs.readFileSync(SUBCATEGORIAS_PATH, 'latin1');
      const subLines = subCatCsv.split('\n').filter(l => l.trim().length > 0);
      
      for (let i = 1; i < subLines.length; i++) {
        const parts = subLines[i].split(';');
        if (parts.length >= 5) {
          const rawCode = parts[0].trim();
          const description = parts[4].trim();
          const formattedCode = formatCode(rawCode);
          
          if (formattedCode && description && !seen.has(formattedCode)) {
            results.push({ 
              codigo: formattedCode, 
              nome: description,
              nomeNormalizado: removeAccents(description)
            });
            seen.add(formattedCode);
          }
        }
      }
    }

    // Sort alphabetically by code
    results.sort((a, b) => a.codigo.localeCompare(b.codigo));
    
    cidCache = results;
    return results;
  } catch (error) {
    console.error('Error parsing CID-10 CSV files:', error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q') || '';
  
  if (rawQuery.length < 2) {
    return NextResponse.json([]);
  }

  const queryWords = removeAccents(rawQuery).split(' ').filter(w => w.length > 0);

  if (queryWords.length === 0) {
    return NextResponse.json([]);
  }

  const data = getCIDData();
  
  // Efficient filtering: check both code and name, and require all words from query to be present
  const filtered = data.filter((item: any) => {
    const searchableText = `${item.codigo.toLowerCase()} ${item.nomeNormalizado}`;
    return queryWords.every(word => searchableText.includes(word));
  }).slice(0, 20); // Top 20 results for performance and UI

  // Remove the 'nomeNormalizado' field before sending to client
  const responseData = filtered.map(({ nomeNormalizado, ...rest }) => rest);

  return NextResponse.json(responseData);
}
