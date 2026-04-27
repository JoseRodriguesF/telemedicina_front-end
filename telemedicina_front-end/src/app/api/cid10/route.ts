
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Memory cache to keep it efficient
let cidCache: any[] | null = null;

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
            results.push({ codigo: code, nome: description });
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
            results.push({ codigo: formattedCode, nome: description });
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
  const query = searchParams.get('q')?.toLowerCase() || '';

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const data = getCIDData();
  
  // Efficient filtering: check both code and name
  const filtered = data.filter((item: any) => 
    item.codigo.toLowerCase().includes(query) || 
    item.nome.toLowerCase().includes(query)
  ).slice(0, 20); // Top 20 results for performance and UI

  return NextResponse.json(filtered);
}
