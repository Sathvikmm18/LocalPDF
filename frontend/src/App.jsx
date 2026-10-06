import React, { useEffect, useMemo, useState } from 'react';

const API = 'http://127.0.0.1:8000/api';
const tools = [
  {id:'word', title:'Word to PDF', desc:'Convert DOCX and other Office documents', icon:'W', group:'Convert'},
  {id:'merge', title:'Merge PDF', desc:'Combine PDFs in the order you choose', icon:'↗', group:'Organize'},
  {id:'split', title:'Split PDF', desc:'Extract the pages you need', icon:'⇱', group:'Organize'},
  {id:'compress', title:'Compress PDF', desc:'Optimize and reduce PDF size', icon:'⇣', group:'Optimize'},
  {id:'rotate', title:'Rotate PDF', desc:'Rotate all or selected pages', icon:'⟳', group:'Organize'},
  {id:'images', title:'Images to PDF', desc:'Turn JPG or PNG images into a PDF', icon:'▧', group:'Convert'},
  {id:'jpg', title:'PDF to JPG', desc:'Export pages as JPG images in a ZIP', icon:'▤', group:'Convert'},
  {id:'numbers', title:'Page numbers', desc:'Add page numbers to every page', icon:'#', group:'Edit'},
  {id:'watermark', title:'Watermark', desc:'Stamp text on every page', icon:'T', group:'Edit'},
  {id:'protect', title:'Protect PDF', desc:'Encrypt a PDF with a password', icon:'⌑', group:'Security'}
];
const fmt = n => n < 1024 ? `${n} B` : n < 1024*1024 ? `${(n/1024).toFixed(1)} KB` : `${(n/1024/1024).toFixed(2)} MB`;

export default function App(){
  const [files,setFiles] = useState([]);
  const [selected,setSelected] = useState([]);
  const [active,setActive] = useState('home');
  const [tool,setTool] = useState(null);
  const [query,setQuery] = useState('');
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');
  const [form,setForm] = useState({pages:'1-3',degrees:'90',watermark:'CONFIDENTIAL',password:'',position:'bottom-center'});
  const [health,setHealth] = useState(null);

  async function request(url, options={}){
    const res = await fetch(API+url, options);
    let data = {};
    try { data = await res.json(); } catch {}
    if(!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
    return data;
  }
  async function refresh(){
    try{
      const [f,h] = await Promise.all([request('/files'),request('/health')]);
      setFiles(f.files); setHealth(h); setError('');
    }catch(e){setError('Cannot connect to the local backend. Start FastAPI using the setup instructions.');}
  }
  useEffect(()=>{refresh();},[]);
  const filtered = useMemo(()=>files.filter(f=>f.name.toLowerCase().includes(query.toLowerCase())),[files,query]);
  const pdfs = files.filter(f=>f.type==='.pdf');
  const picked = selected.map(id=>files.find(f=>f.id===id)).filter(Boolean);
  function toggle(id){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);}
  async function upload(ev){
    const list = [...ev.target.files]; if(!list.length) return;
    setBusy(true); setError(''); setNotice('');
    try{
      const fd = new FormData(); list.forEach(f=>fd.append('files',f));
      const result = await request('/upload',{method:'POST',body:fd});
      setNotice(`${result.files.length} file(s) saved to your local library.`);
      await refresh(); setSelected(s=>[...s,...result.files.map(f=>f.id)]);
    }catch(e){setError(e.message)}finally{setBusy(false);ev.target.value='';}
  }
  async function runTool(){
    if(!tool) return;
    setBusy(true); setError(''); setNotice('');
    try{
      let endpoint='', fd=new FormData();
      const ids=selected;
      if(tool.id==='word'){
        const docs=picked.filter(x=>['.docx','.doc','.odt','.rtf','.txt'].includes(x.type));
        if(!docs.length) throw new Error('Select one or more Word/Office/text documents in your library first.');
        endpoint='/convert/word-to-pdf-batch'; docs.forEach(f=>fd.append('file_ids',f.id));
      }else if(tool.id==='merge'){
        const chosen=picked.filter(f=>f.type==='.pdf');
        if(chosen.length<2) throw new Error('Select at least two PDFs in the Library first. Selection order is the order shown in the library.');
        endpoint='/pdf/merge'; chosen.forEach(f=>fd.append('file_ids',f.id)); fd.append('output_name','merged.pdf');
      }else if(tool.id==='split'){
        const f=picked.find(x=>x.type==='.pdf'); if(!f) throw new Error('Select a PDF first.');
        endpoint='/pdf/split'; fd.append('file_id',f.id); fd.append('pages',form.pages); fd.append('output_name','split.pdf');
      }else if(tool.id==='compress'){
        const f=picked.find(x=>x.type==='.pdf'); if(!f) throw new Error('Select a PDF first.');
        endpoint='/pdf/compress'; fd.append('file_id',f.id);
      }else if(tool.id==='rotate'){
        const f=picked.find(x=>x.type==='.pdf'); if(!f) throw new Error('Select a PDF first.');
        endpoint='/pdf/rotate'; fd.append('file_id',f.id); fd.append('degrees',form.degrees); fd.append('pages','all');
      }else if(tool.id==='images'){
        const chosen=picked.filter(f=>['.png','.jpg','.jpeg','.tif','.tiff'].includes(f.type));
        if(!chosen.length) throw new Error('Select one or more images first.');
        endpoint='/convert/images-to-pdf'; chosen.forEach(f=>fd.append('file_ids',f.id)); fd.append('output_name','images.pdf');
      }else if(tool.id==='jpg'){
        const f=picked.find(x=>x.type==='.pdf'); if(!f) throw new Error('Select a PDF first.');
        endpoint='/convert/pdf-to-jpg'; fd.append('file_id',f.id);
      }else if(tool.id==='numbers'){
        const f=picked.find(x=>x.type==='.pdf'); if(!f) throw new Error('Select a PDF first.');
        endpoint='/pdf/page-numbers'; fd.append('file_id',f.id); fd.append('position',form.position);
      }else if(tool.id==='watermark'){
        const f=picked.find(x=>x.type==='.pdf'); if(!f) throw new Error('Select a PDF first.');
        endpoint='/pdf/watermark'; fd.append('file_id',f.id); fd.append('text',form.watermark);
      }else if(tool.id==='protect'){
        const f=picked.find(x=>x.type==='.pdf'); if(!f) throw new Error('Select a PDF first.');
        if(form.password.length<4) throw new Error('Enter a password with at least 4 characters.');
        endpoint='/pdf/protect'; fd.append('file_id',f.id); fd.append('password',form.password);
      }
      const result=await request(endpoint,{method:'POST',body:fd});
      const out=result.file;
      setSelected(result.files?.map(f=>f.id) || [out.id]);
      setTool(null);
      await refresh();
      // The conversion result is downloaded immediately. Multiple documents are
      // bundled into one ZIP so the browser doesn't block a batch of downloads.
      const link=document.createElement('a');
      link.href=`${API}/download/${encodeURIComponent(out.id)}`;
      link.download=out.name;
      document.body.appendChild(link); link.click(); link.remove();
      setNotice(tool.id==='word' && (result.count || 1)>1
        ? `${result.count} documents converted. Downloading a ZIP containing the PDFs; each PDF is also saved in your local library.`
        : `Finished: ${out.name} — download started and the file is saved in your local library.`);
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  async function removeFile(f){
    if(!confirm(`Permanently delete ${f.name} from your local library?`)) return;
    try{await request('/files/'+encodeURIComponent(f.id),{method:'DELETE'});setSelected(s=>s.filter(x=>x!==f.id));setNotice(`${f.name} deleted.`);await refresh();}
    catch(e){setError(e.message)}
  }
  const download = f => window.open(`${API}/download/${encodeURIComponent(f.id)}`,'_blank','noopener,noreferrer');
  const openTool = t => {setTool(t);setError('');setNotice('');};
  const toolFields = () => {
    if(tool?.id==='split') return <label>Pages to extract <input value={form.pages} onChange={e=>setForm({...form,pages:e.target.value})} placeholder="1-3,5"/></label>;
    if(tool?.id==='rotate') return <label>Rotation <select value={form.degrees} onChange={e=>setForm({...form,degrees:e.target.value})}><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">270° clockwise</option></select></label>;
    if(tool?.id==='watermark') return <label>Watermark text <input value={form.watermark} onChange={e=>setForm({...form,watermark:e.target.value})}/></label>;
    if(tool?.id==='protect') return <label>PDF password <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 4 characters"/></label>;
    if(tool?.id==='numbers') return <label>Position <select value={form.position} onChange={e=>setForm({...form,position:e.target.value})}><option value="bottom-center">Bottom center</option><option value="bottom-left">Bottom left</option><option value="bottom-right">Bottom right</option><option value="top-center">Top center</option><option value="top-left">Top left</option><option value="top-right">Top right</option></select></label>;
    return null;
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">L</div><span>Local<span className="brand-light">PDF</span></span></div>
      <div className="local-pill"><span className="green-dot"></span> Local & private</div>
      <button className={`nav-item ${active==='home'?'active':''}`} onClick={()=>{setActive('home');setTool(null)}}><span>⌂</span> Home</button>
      <button className={`nav-item ${active==='library'?'active':''}`} onClick={()=>{setActive('library');setTool(null)}}><span>▤</span> My library <b>{files.length}</b></button>
      <div className="side-label">TOOLS</div>
      {['Organize','Optimize','Convert','Edit','Security'].map(group=><div key={group} className="nav-group">
        <div className="side-label small">{group}</div>
        {tools.filter(t=>t.group===group).map(t=><button key={t.id} className="nav-item compact" onClick={()=>openTool(t)}><span className="tool-mini">{t.icon}</span>{t.title}</button>)}
      </div>)}
      <div className="sidebar-bottom"><div className="shield">✓</div><div><strong>Your files stay here</strong><p>No cloud uploads. No subscription.</p></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> {active==='library'?'My library':tool?tool.title:'Home'}</div><div className="top-right"><span className="status"><i></i>{health?'Backend connected':'Connecting…'}</span><div className="avatar">S</div><span className="user-name">Sathvik's workspace</span></div></header>
      <div className="content">
        {error && <div className="alert error"><span>!</span>{error}<button onClick={()=>setError('')}>×</button></div>}
        {notice && <div className="alert success"><span>✓</span>{notice}<button onClick={()=>setNotice('')}>×</button></div>}
        {tool ? <section className="tool-workspace">
          <button className="back-link" onClick={()=>setTool(null)}>← Back to tools</button>
          <div className="page-heading"><div><div className="eyebrow">{tool.group} tool</div><h1>{tool.title}</h1><p>{tool.desc}. Processed files are saved to your local library.</p></div><div className="large-icon">{tool.icon}</div></div>
          <div className="work-card">
            <div className="work-title"><h2>Select your files</h2><span className="muted">{selected.length} selected</span></div>
            <p className="muted">Select files in the library below, or upload new ones.</p>
            <label className="upload-zone"><input type="file" multiple accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.png,.jpg,.jpeg,.tif,.tiff" onChange={upload}/><div className="upload-symbol">↑</div><strong>Click to upload files</strong><span>PDF, Word, JPG, PNG and more · stored locally</span></label>
            {toolFields()}
            <div className="selected-list">{picked.map(f=><div className="selected-file" key={f.id}><span className="file-icon">{f.type==='.pdf'?'PDF':f.type.replace('.','').toUpperCase().slice(0,4)}</span><div><strong>{f.name}</strong><small>{fmt(f.size)}</small></div><button onClick={()=>toggle(f.id)}>Remove</button></div>)}</div>
            <button className="primary-btn" disabled={busy} onClick={runTool}>{busy?'Converting…':tool.id==='word'?'Download PDF':`Run ${tool.title} →`}</button>
          </div>
        </section> : active==='library' ? <section>
          <div className="page-heading"><div><div className="eyebrow">YOUR DOCUMENTS</div><h1>My library</h1><p>Originals and processed files stay on this Mac until you delete them.</p></div><label className="primary-btn upload-button">＋ Upload files<input type="file" multiple accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.png,.jpg,.jpeg,.tif,.tiff" onChange={upload}/></label></div>
          <div className="library-toolbar"><input placeholder="Search your files…" value={query} onChange={e=>setQuery(e.target.value)}/><span>{filtered.length} files · {fmt(filtered.reduce((n,f)=>n+f.size,0))}</span></div>
          <FileTable files={filtered} selected={selected} toggle={toggle} download={download} removeFile={removeFile}/>
        </section> : <>
          <section className="hero">
            <div className="hero-copy"><div className="eyebrow light">YOUR PERSONAL DOCUMENT WORKSPACE</div><h1>Everything PDF.<br/><em>Nothing leaves your Mac.</em></h1><p>Convert, organize and optimize your documents in one private workspace. Free to use, with no daily limits or paid APIs.</p><div className="hero-actions"><label className="hero-upload">↑ Upload documents<input type="file" multiple accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.png,.jpg,.jpeg,.tif,.tiff" onChange={upload}/></label><button className="hero-secondary" onClick={()=>{setActive('library');setTool(null)}}>Open my library ↗</button></div><div className="hero-points"><span>✓ Local processing</span><span>✓ Persistent library</span><span>✓ No subscription</span></div></div>
            <div className="hero-art"><div className="paper paper-back"><div></div><div></div><div></div></div><div className="paper paper-front"><div className="pdf-badge">PDF</div><div className="paper-line wide"></div><div className="paper-line"></div><div className="paper-line short"></div><div className="paper-chart"><i></i><i></i><i></i><i></i><i></i></div><div className="paper-line wide"></div><div className="paper-line"></div></div><div className="floating-check">✓</div><div className="floating-lock">⌑ <small>100% local</small></div></div>
          </section>
          <div className="section-head"><div><div className="eyebrow">GET THINGS DONE</div><h2>What would you like to do?</h2></div><span className="muted">10 tools available</span></div>
          <div className="tool-grid">{tools.map(t=><button className="tool-card" key={t.id} onClick={()=>openTool(t)}><div className={`tool-icon icon-${t.group.toLowerCase()}`}>{t.icon}</div><div className="tool-card-copy"><strong>{t.title}</strong><p>{t.desc}</p></div><span className="card-arrow">↗</span></button>)}</div>
          <section className="recent-section"><div className="section-head"><div><div className="eyebrow">PERSISTENT STORAGE</div><h2>Recently added</h2></div><button className="text-button" onClick={()=>{setActive('library');setTool(null)}}>View library →</button></div>
            {files.length?<FileTable files={files.slice(0,5)} selected={selected} toggle={toggle} download={download} removeFile={removeFile}/>:<div className="empty-state"><div className="empty-icon">▤</div><strong>Your library is ready</strong><p>Upload a document to get started. Files remain here until you delete them.</p><label className="secondary-btn">＋ Upload first file<input type="file" multiple onChange={upload}/></label></div>}
          </section>
        </>}
        <footer><span>LocalPDF <b>·</b> Personal workspace</span><span><i></i> Runs on your Mac · No cloud processing</span></footer>
      </div>
    </main>
  </div>
}
function FileTable({files,selected,toggle,download,removeFile}){
  if(!files.length)return <div className="empty-state compact-empty"><strong>No files found</strong><p>Upload documents to build your library.</p></div>;
  return <div className="table-wrap"><table><thead><tr><th>NAME</th><th>TYPE</th><th>SIZE</th><th>ADDED</th><th>ACTIONS</th></tr></thead><tbody>{files.map(f=><tr key={f.id}><td><label className="file-name"><input type="checkbox" checked={selected.includes(f.id)} onChange={()=>toggle(f.id)}/><span className={`file-icon ${f.type==='.pdf'?'pdf':''}`}>{f.type==='.pdf'?'PDF':f.type.replace('.','').toUpperCase().slice(0,4)}</span><span>{f.name}</span></label></td><td><span className="type-chip">{f.type.replace('.','').toUpperCase()}</span></td><td>{fmt(f.size)}</td><td>{new Date(f.modified*1000).toLocaleDateString()}</td><td><div className="row-actions"><button title="Download" onClick={()=>download(f)}>↓</button><button title="Delete permanently" onClick={()=>removeFile(f)}>×</button></div></td></tr>)}</tbody></table></div>
}
