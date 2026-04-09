export default async function handler(req, res) {
  // Verifica se a chamada é do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const feedId = process.env.META_FEED_ID; 
    const token = process.env.META_TOKEN;
    const xmlUrl = 'https://fedautos.vercel.app/api/feed';

    // Dispara o comando para o Facebook atualizar o catálogo
    const metaResponse = await fetch(`https://graph.facebook.com/v19.0/${feedId}/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: token,
        url: xmlUrl
      })
    });

    const data = await metaResponse.json();

    if (data.error) throw new Error(data.error.message);

    res.status(200).json({ success: true, message: "Meta avisada com sucesso!" });
    
  } catch (error) {
    console.error("Erro na API de Sync:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
