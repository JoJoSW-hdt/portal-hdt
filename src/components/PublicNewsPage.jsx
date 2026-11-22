import React from "react";
import { Leaf } from "lucide-react";
import { cleanHtml } from "../RichTextEditor";

export default function PublicNewsPage({ newsPosts }) {
  const published = newsPosts.filter(n => n.status === "published" && (!n.published_at || new Date(n.published_at) <= new Date()));

  return <>
    <div className="public-section-head">
      <div>
        <span className="eyebrow">MURAL DA COMUNIDADE</span>
        <h2>Notícias</h2>
        <p>Novidades e comunicados dos Heróis do Tempo.</p>
      </div>
    </div>
    {published.length ? <div className="news-grid">
      {published.map(n => <article className="news-card news-article" key={n.id}>
        <span className="eyebrow">{n.published_at ? new Date(n.published_at).toLocaleDateString("pt-BR") : "COMUNIDADE"}</span>
        <h3>{n.title}</h3>
        {n.summary && <p>{n.summary}</p>}
        <div className="post-rich-content" dangerouslySetInnerHTML={{ __html: cleanHtml(n.body || "") }} />
      </article>)}
    </div> : <div className="empty-public">
      <div className="empty-public-icon"><Leaf size={25}/></div>
      <strong>Ainda não há notícias publicadas</strong>
      <span>Quando a equipe publicar novidades, elas aparecerão por aqui.</span>
    </div>}
  </>;
}
