export default async function handler(req, res) {
  // 1. Bloqueia curiosos (só aceita chamadas do seu painel)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // 2. Puxa as chaves de segurança da Vercel
    const feedId = process.env.META_FEED_ID; 
    const token = process.env.META_TOKEN;
    const xmlUrl = 'https://fedautos.vercel.app/api/feed'; // O link do seu XML

    // Trava de segurança caso as variáveis não estejam configuradas
    if (!feedId || !token) {
       throw new Error("Chaves da Meta não configuradas na Vercel.");
    }

    // 3. Bate na porta da API da Meta e manda ela ler o XML agora
    const metaResponse = await fetch(`https://graph.facebook.com/v19.0/${feedId}/uploads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access_token: token,
        url: xmlUrl
      })
    });

    const data = await metaResponse.json();

    // 4. Verifica se a Meta reclamou de algo
    if (data.error) {
      throw new Error(data.error.message);
    }

    // 5. Devolve o "OK" para o seu painel admin
    res.status(200).json({ success: true, message: "Sincronização iniciada com sucesso", id: data.id });
    
  } catch (error) {
    // 6. Se algo der errado, avisa o painel
    res.status(500).json({ success: false, error: error.message });
  }
}
