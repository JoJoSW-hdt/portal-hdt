import React, { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { isAllowedCommunityImageUrl } from "./lib/communityImages";

const allowedTags = new Set(["P","BR","STRONG","B","EM","I","U","UL","OL","LI","H2","H3","BLOCKQUOTE","A","IMG","DIV"]);
export function cleanHtml(html) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) { child.remove(); return; }
      if (!allowedTags.has(child.tagName)) {
        clean(child);
        child.replaceWith(...child.childNodes);
        return;
      }
      [...child.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (child.tagName === "A" && name === "href") {
          try {
            const url = new URL(attr.value, window.location.origin);
            if (!["http:", "https:"].includes(url.protocol)) child.removeAttribute(attr.name);
            else child.setAttribute("rel", "noopener noreferrer");
          } catch { child.removeAttribute(attr.name); }
        } else if (child.tagName === "IMG" && name === "src") {
          if (!isAllowedCommunityImageUrl(attr.value)) child.removeAttribute(attr.name);
        } else if (name === "style") {
          const match = attr.value.match(/text-align\\s*:\\s*(left|center|right|justify)/i);
          if (match) child.setAttribute("style", `text-align:${match[1].toLowerCase()}`);
          else child.removeAttribute(attr.name);
        } else if (child.tagName === "IMG" && name === "alt") {
          // Keep accessible image descriptions.
        } else if (child.tagName === "IMG" && name === "width" && /^\\d{1,3}%?$/.test(attr.value)) {
          // Keep bounded numeric or percentage widths.
        } else child.removeAttribute(attr.name);
      });
      clean(child);
    });
  };
  clean(doc.body);
  return doc.body.innerHTML.trim();
}

export default function RichTextEditor({initialHtml="",onSave,onCancel,busy=false,submitLabel="Publicar",supabase,profile}) {
  const editor = useRef(null);
  const file = useRef(null);
  const [uploading,setUploading] = useState(false);
  useEffect(()=>{ if(editor.current) editor.current.innerHTML=initialHtml; },[initialHtml]);
  function command(name,value=null){ editor.current?.focus(); document.execCommand(name,false,value); }
  async function insertImage(image,supabase,profile){
    if(!image || !["image/png","image/jpeg","image/webp"].includes(image.type)) throw new Error("Use uma imagem PNG, JPG ou WebP.");
    if(image.size>5*1024*1024) throw new Error("A imagem deve ter até 5 MB.");
    setUploading(true);
    try {
      const ext=(image.name.split(".").pop()||"png").toLowerCase().replace(/[^a-z0-9]/g,"");
      const path=`posts/${profile.id}/${crypto.randomUUID()}.${ext}`;
      const {error}=await supabase.storage.from("portal-assets").upload(path,image,{contentType:image.type});
      if(error) throw error;
      const url=supabase.storage.from("portal-assets").getPublicUrl(path).data.publicUrl;
      editor.current?.focus();
      document.execCommand("insertHTML",false,`<p><img src="${url}" alt="Imagem da publicação" /></p><p><br></p>`);
    } finally { setUploading(false); }
  }
  return <form className="community-editor" onSubmit={e=>{e.preventDefault();onSave(cleanHtml(editor.current?.innerHTML||""));}}>
    <div className="editor-toolbar">
      <button type="button" title="Negrito" onClick={()=>command("bold")}><Bold size={16}/></button>
      <button type="button" title="Itálico" onClick={()=>command("italic")}><Italic size={16}/></button>
      <button type="button" title="Sublinhado" onClick={()=>command("underline")}><Underline size={16}/></button>
      <span/>
      <button type="button" title="Lista" onClick={()=>command("insertUnorderedList")}><List size={16}/></button>
      <button type="button" title="Alinhar à esquerda" onClick={()=>command("justifyLeft")}><AlignLeft size={16}/></button>
      <button type="button" title="Centralizar" onClick={()=>command("justifyCenter")}><AlignCenter size={16}/></button>
      <button type="button" title="Alinhar à direita" onClick={()=>command("justifyRight")}><AlignRight size={16}/></button>
      <button type="button" title="Inserir link" onClick={()=>{const url=window.prompt("Cole o endereço do link:");if(url)command("createLink",url);}}><span className="editor-link">Link</span></button>
      <button type="button" title="Inserir imagem" disabled={uploading} onClick={()=>file.current?.click()}><ImageIcon size={16}/></button>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async e=>{try{await insertImage(e.target.files?.[0],supabase,profile);}catch(err){window.alert(err.message);}finally{e.target.value="";}}}/>
    </div>
    <div ref={editor} className="editor-content" contentEditable suppressContentEditableWarning data-placeholder="Compartilhe uma novidade, uma lembrança ou uma história com a comunidade..." />
    <div className="editor-footer"><small>{uploading?"Enviando imagem...":"Você pode formatar o texto e inserir imagens entre os parágrafos."}</small><div>{onCancel&&<button type="button" className="outline-btn" onClick={onCancel}>Cancelar</button>}<button className="primary-btn" disabled={busy||uploading}>{busy?"Salvando...":submitLabel}</button></div></div>
  </form>;
}
