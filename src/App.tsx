import { useEffect, useRef, useState } from 'react';
import { Home, FolderKanban, Images, Table2, Ruler, CalendarCheck, Plus, Search, ArrowRight, ArrowLeft, X, Trash2, Upload, Type, StickyNote, MousePointer2, MoveRight, Highlighter, ZoomIn, ZoomOut, Check, Undo2, Redo2, Copy, BringToFront, SendToBack, ImageDown, Grid3X3, CalendarDays, List, Columns3, Download } from 'lucide-react';
import './styles.css';
type Area = 'Home' | 'My Projects' | 'Moodboards' | 'Spreadsheets' | 'Layout Studio' | 'Planner';
type Project = {
    id: string;
    name: string;
    kind: 'Event' | 'Interior';
    type: string;
    date: string;
    location: string;
    budget: number;
    created: number;
    cover?: string;
    coverColor?: string;
    coverText?: string;
};
type NodeKind = 'image' | 'note' | 'text' | 'highlight';
type BoardNode = {
    id: string;
    kind: NodeKind;
    x: number;
    y: number;
    w: number;
    h: number;
    text: string;
    color: string;
    src?: string;
    fontColor?: string;
    fontSize?: number;
};
type Edge = {
    id: string;
    from: string;
    to: string;
};
type Board = {
    id: string;
    name: string;
    projectId: string;
    nodes: BoardNode[];
    edges: Edge[];
    background?: string;
    preview?: string;
};
type Sheet = {
    id: string;
    name: string;
    projectId: string;
    color: string;
    cells: Record<string, string>;
};
type Task = {
    id: string;
    title: string;
    projectId: string;
    status: 'To do' | 'In progress' | 'Done';
    date: string;
    priority: 'Low' | 'Medium' | 'High';
    category?: string;
    color?: string;
};
type LayoutItem = {
    id: string;
    kind: string;
    x: number;
    y: number;
    w?: number;
    h?: number;
    rotation?: number;
};
type LayoutDoc = {
    id: string;
    name: string;
    projectId: string;
    photo?: string;
    background?: string;
    opacity?: number;
    roomWidth?: number;
    roomHeight?: number;
    snap?: boolean;
    items: LayoutItem[];
};
type Data = {
    projects: Project[];
    boards: Board[];
    sheets: Sheet[];
    tasks: Task[];
    layouts: LayoutDoc[];
};
const key = 'desy-v2';
const uid = () => Math.random().toString(36).slice(2, 10);
const blank = (): Data => ({ projects: [], boards: [], sheets: [], tasks: [], layouts: [] });
// Load the projects you made before, if this browser has any saved.
function initial(): Data { try {
    const raw = localStorage.getItem(key);
    if (raw) {
        const v = JSON.parse(raw);
        return { ...blank(), ...v };
    }
}
catch { } return blank(); }
const pastel = ['#e8e9ff', '#fbe6ed', '#e7f3e9', '#fff0d9', '#e4f1f5'];
const templates = [{ name: 'Event Budget', color: pastel[1], rows: [['Item', 'Category', 'Estimated', 'Actual'], ['Venue', 'Venue', '1500', '0'], ['Flowers', 'Decor', '300', '0']] }, { name: 'Interior Budget', color: pastel[0], rows: [['Item', 'Room', 'Estimated', 'Actual'], ['Sofa', 'Living room', '1200', '0'], ['Rug', 'Living room', '250', '0']] }, { name: 'Shopping List', color: pastel[2], rows: [['Item', 'Store', 'Quantity', 'Price'], ['Example item', '', '1', '0']] }, { name: 'Blank Spreadsheet', color: pastel[3], rows: [] }];
function makeCells(rows: string[][]) { const cells: Record<string, string> = {}; rows.forEach((row, r) => row.forEach((v, c) => { cells[`${r}:${c}`] = v; })); return cells; }
// Work out simple spreadsheet formulas, including references to other cells.
function calcCell(raw: string, cells: Record<string, string>, visited: Set<string> = new Set()): string {
    if (!raw.startsWith('='))
        return raw;
    const expr = raw.slice(1).toUpperCase().replace(/\s+/g, '');
    const value = (ref: string): number => { if (visited.has(ref))
        throw Error('CYCLE'); const col = ref.charCodeAt(0) - 65, row = Number(ref.slice(1)) - 1; if (col < 0 || col > 7 || row < 0 || row > 24)
        throw Error('REF'); const key = `${row}:${col}`, next = new Set(visited); next.add(ref); const result = calcCell(cells[key] || '', cells, next); const num = Number(result); if (!Number.isFinite(num))
        throw Error('VALUE'); return num; };
    try {
        let parsed = expr.replace(/(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\(([A-H]\d+):([A-H]\d+)\)/g, (_match, fn: string, first: string, last: string) => {
            const c1 = first.charCodeAt(0) - 65, c2 = last.charCodeAt(0) - 65, r1 = Number(first.slice(1)), r2 = Number(last.slice(1));
            const nums: number[] = [];
            for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++)
                for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
                    const ref = String.fromCharCode(65 + c) + r;
                    const key = `${r - 1}:${c}`;
                    if ((cells[key] || '').trim())
                        nums.push(value(ref));
                }
            if (fn === 'SUM')
                return String(nums.reduce((a, b) => a + b, 0));
            if (fn === 'COUNT')
                return String(nums.length);
            if (!nums.length)
                return '0';
            if (fn === 'MIN')
                return String(Math.min(...nums));
            if (fn === 'MAX')
                return String(Math.max(...nums));
            return String(nums.reduce((a, b) => a + b, 0) / nums.length);
        });
        parsed = parsed.replace(/\b([A-H](?:[1-9]|1\d|2[0-5]))\b/g, ref => String(value(ref)));
        if (!/^[0-9.+*/()%-]+$/.test(parsed))
            return '#FORMULA';
        const tokens = parsed.match(/\d+(?:\.\d+)?|[()+*/%-]/g);
        if (!tokens || tokens.join('') !== parsed)
            return '#ERROR';
        const result = Function('"use strict";return (' + parsed + ')')() as number;
        return Number.isFinite(result) ? String(Math.round(result * 1e8) / 1e8) : '#ERROR';
    }
    catch (e) {
        return e instanceof Error && e.message === 'CYCLE' ? '#CYCLE!' : '#ERROR';
    }
}
// This is the main workspace: it handles navigation and keeps the app data in sync.
export default function App() {
    const [data, setData] = useState<Data>(initial);
    const [area, setArea] = useState<Area>('Home');
    const [projectId, setProjectId] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [draft, setDraft] = useState({ name: '', kind: 'Event' as Project['kind'], type: 'Birthday', date: '', location: '', budget: '', cover: '', coverColor: '#eeeaff', coverText: '' });
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [boardId, setBoardId] = useState('');
    const [sheetId, setSheetId] = useState('');
    const [layoutId, setLayoutId] = useState('');
    useEffect(() => { try {
        localStorage.setItem(key, JSON.stringify(data));
    }
    catch {
        alert('Browser storage is full. Try using smaller images.');
    } }, [data]);
    const update = (fn: (v: Data) => Data) => setData(v => fn(v));
    const current = data.projects.find(p => p.id === projectId);
    const go = (next: Area) => { setArea(next); setBoardId(''); setSheetId(''); setLayoutId(''); };
    const makeProject = () => { if (!draft.name.trim())
        return; const p: Project = { id: uid(), name: draft.name.trim(), kind: draft.kind, type: draft.type, date: draft.date, location: draft.location, budget: Number(draft.budget) || 0, created: Date.now(), cover: draft.cover || undefined, coverColor: draft.coverColor, coverText: draft.coverText.trim() || undefined }; update(v => ({ ...v, projects: [p, ...v.projects] })); setCreateOpen(false); setDraft({ name: '', kind: 'Event', type: 'Birthday', date: '', location: '', budget: '', cover: '', coverColor: '#eeeaff', coverText: '' }); setProjectId(p.id); setArea('My Projects'); };
    const deleteProject = (p: Project) => { if (!confirm(`Delete “${p.name}” and its associated boards, sheets, tasks, and layouts?`))
        return; update(v => ({ ...v, projects: v.projects.filter(x => x.id !== p.id), boards: v.boards.filter(x => x.projectId !== p.id), sheets: v.sheets.filter(x => x.projectId !== p.id), tasks: v.tasks.filter(x => x.projectId !== p.id), layouts: v.layouts.filter(x => x.projectId !== p.id) })); if (projectId === p.id)
        setProjectId(''); };
    const nav: [
        Area,
        typeof Home
    ][] = [['Home', Home], ['My Projects', FolderKanban], ['Moodboards', Images], ['Spreadsheets', Table2], ['Layout Studio', Ruler], ['Planner', CalendarCheck]];
    return <div className="shell">
<aside className="sidebar">
<button className="logo" onClick={() => { setProjectId(''); go('Home'); }}>Desy<span>✳</span>
</button>
<nav>{nav.map(([name, Icon]) => <button key={name} className={'nav-item ' + (area === name ? 'active' : '')} onClick={() => { setProjectId(''); go(name); }}>
<Icon size={19} strokeWidth={1.7}/>
{name}</button>)}</nav>
<div className="side-foot">DESIGN<br />CREATE<br />ORGANIZE<br />YOUR WAY</div>
</aside>
<div className="main">
<header className="topbar">
<span className="crumb">Workspace {area !== 'Home' && <>
<span> / </span>{area}</>} {current && <>
<span> / </span>{current.name}</>}</span>
<span className="top-badge">YOUR CREATIVE SPACE</span>
</header>
        {area === 'Home' ? <>
<div className="hero">
<div className="eyebrow">WELCOME TO DESY</div>
<h1>Make room for<br />
<span>your next big idea.</span>
</h1>
<p>One beautiful space for your projects, ideas, and everything in between.</p>
<button className="primary" onClick={() => setCreateOpen(true)}>
<Plus size={18}/> Create new project <ArrowRight size={17}/>
</button>
</div>
<div className="section-title">
<div>
<span className="eyebrow">YOUR COLLECTION</span>
<h2>My Projects <small>{data.projects.length}</small>
</h2>
</div>
<button className="text-btn" onClick={() => go('My Projects')}>View all <ArrowRight size={17}/>
</button>
</div>
<ProjectGrid projects={data.projects.slice(0, 6)} open={p => { setProjectId(p.id); go('My Projects'); }} remove={deleteProject} create={() => setCreateOpen(true)} update={update}/>
<div className="section-title tools-heading">
<div>
<span className="eyebrow">YOUR CREATIVE TOOLKIT</span>
<h2>Everything in one place.</h2>
</div>
</div>
<div className="tool-grid">{nav.slice(2).map(([name, Icon], i) => <button className="tool-card" key={name} onClick={() => go(name)}>
<span className="tool-icon" style={{ background: pastel[i] }}>
<Icon size={23}/>
</span>
<strong>{name}</strong>
<small>{['An open canvas for your ideas', 'Colorful sheets for every plan', 'Visualize and arrange your space', 'Keep your plans moving'][i]}</small>
<ArrowRight size={18}/>
</button>)}</div></> : area === 'My Projects' ? <>
<div className="page-heading">
<div>
<span className="eyebrow">YOUR CREATIVE LIBRARY</span>
<h1>{current ? current.name : 'My Projects'}</h1>
<p>{current ? 'All your tools, organized around this project.' : 'Every idea has a place to grow.'}</p>
</div>
<button className="primary" onClick={() => setCreateOpen(true)}>
<Plus size={17}/> New project</button>
</div>{current ? <>
<button className="back" onClick={() => setProjectId('')}>
<ArrowLeft size={16}/> All projects</button>
            <ProjectOverview project={current} data={data} open={(next, id) => { setArea(next); if (next === 'Moodboards')
                setBoardId(id); if (next === 'Spreadsheets')
                setSheetId(id); if (next === 'Layout Studio')
                setLayoutId(id); }}/>
            </> : <>
<div className="toolbar">
<div className="filters">{['All', 'Event', 'Interior'].map(f => <button key={f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>{f === 'All' ? 'All projects' : f === 'Event' ? 'Events' : 'Interiors'}</button>)}</div>
<label className="search">
<Search size={17}/>
<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects"/>
</label>
</div>
<ProjectGrid projects={data.projects.filter(p => (filter === 'All' || p.kind === filter) && p.name.toLowerCase().includes(search.toLowerCase()))} open={p => setProjectId(p.id)} remove={deleteProject} create={() => setCreateOpen(true)} update={update}/></>}</> : area === 'Moodboards' ? <Moodboards data={data} update={update} projectId={projectId} boardId={boardId} setBoardId={setBoardId}/> : area === 'Spreadsheets' ? <Spreadsheets data={data} update={update} projectId={projectId} sheetId={sheetId} setSheetId={setSheetId}/> : area === 'Layout Studio' ? <Layouts data={data} update={update} projectId={projectId} layoutId={layoutId} setLayoutId={setLayoutId}/> : <Planner data={data} update={update} projectId={projectId}/>}
    </div>{createOpen && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget)
        setCreateOpen(false); }}>
<div className="dialog">
<div className="dialog-top">
<span className="eyebrow">START SOMETHING NEW</span>
<button className="icon-btn" onClick={() => setCreateOpen(false)}>
<X size={21}/>
</button>
</div>
<h2>Create a project</h2>
<p>Every big idea begins somewhere.</p>
<label className="field-label">What are you working on?</label>
<div className="kind-choices">
<button className={draft.kind === 'Event' ? 'chosen' : ''} onClick={() => setDraft({ ...draft, kind: 'Event', type: 'Birthday' })}>✳ Plan an event</button>
<button className={draft.kind === 'Interior' ? 'chosen' : ''} onClick={() => setDraft({ ...draft, kind: 'Interior', type: 'Living Room' })}>⌂ Design a space</button>
</div>
<label className="field-label">Project name *</label>
<input className="field" autoFocus placeholder="Give your project a name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/>
<div className="field-two">
<div>
<label className="field-label">{draft.kind === 'Event' ? 'Occasion' : 'Room type'}</label>
<select className="field" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}>{(draft.kind === 'Event' ? ['Birthday', 'Dinner Party', 'Wedding', 'Gallery Opening', 'Celebration', 'Other'] : ['Living Room', 'Bedroom', 'Kitchen', 'Office', 'Studio', 'Other']).map(x => <option key={x}>{x}</option>)}</select>
</div>
<div>
<label className="field-label">Target date (optional)</label>
<input className="field" type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })}/>
</div>
</div>
<label className="field-label">Location (optional)</label>
<input className="field" placeholder="City, venue, or room" value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })}/>
<label className="field-label">Budget (optional)</label>
<input className="field" type="number" min="0" placeholder="0" value={draft.budget} onChange={e => setDraft({ ...draft, budget: e.target.value })}/>
<div className="project-cover-editor">
<label className="field-label">Project card appearance (optional)</label>
<label className="upload-box">Choose cover image<input type="file" accept="image/*" hidden onChange={e => { const file = e.target.files?.[0]; if (file)
        readImage(file, src => setDraft(d => ({ ...d, cover: src }))); e.target.value = ''; }}/>
</label>{draft.cover && <>
<img className="cover-preview" src={draft.cover} alt="Project cover preview"/>
<button className="outline" onClick={() => setDraft({ ...draft, cover: '' })}>Remove image</button></>}<label className="field-label">Or choose a background color</label>
<input aria-label="Project cover color" type="color" value={draft.coverColor} onChange={e => setDraft({ ...draft, coverColor: e.target.value })}/>
<label className="field-label">Cover text (optional)</label>
<input className="field" placeholder="e.g. My dream space" value={draft.coverText} onChange={e => setDraft({ ...draft, coverText: e.target.value })}/>
</div>
<div className="dialog-actions">
<button className="outline" onClick={() => setCreateOpen(false)}>Cancel</button>
<button className="primary" disabled={!draft.name.trim()} onClick={makeProject}>Create project <ArrowRight size={17}/>
</button>
</div>
</div>
</div>}</div>;
}
// One project brings its boards, spreadsheets, layouts, and tasks together.
function ProjectOverview({ project, data, open }: {
    project: Project;
    data: Data;
    open: (area: Area, id: string) => void;
}) {
    const boards = data.boards.filter(x => x.projectId === project.id), sheets = data.sheets.filter(x => x.projectId === project.id), layouts = data.layouts.filter(x => x.projectId === project.id), tasks = data.tasks.filter(x => x.projectId === project.id);
    const done = tasks.filter(x => x.status === 'Done').length;
    const groups: {
        area: Area;
        title: string;
        items: {
            id: string;
            name: string;
        }[];
        icon: typeof Images;
    }[] = [
        { area: 'Moodboards', title: 'Moodboards', items: boards, icon: Images }, { area: 'Spreadsheets', title: 'Spreadsheets', items: sheets, icon: Table2 }, { area: 'Layout Studio', title: 'Layouts', items: layouts, icon: Ruler }
    ];
    return <>
<div className="project-overview">
<div className="project-icon">{project.kind === 'Interior' ? '⌂' : '✳'}</div>
<div>
<div className="eyebrow">{project.kind === 'Interior' ? 'INTERIOR DESIGN' : 'EVENT PLANNING'}</div>
<h2>{project.name}</h2>
<p>{project.type}{project.location ? ' · ' + project.location : ''}{project.date ? ' · ' + project.date : ''}</p>
</div>
</div>
 <div className="overview-stats">
<div>
<small>MOODBOARDS</small>
<strong>{boards.length}</strong>
</div>
<div>
<small>SPREADSHEETS</small>
<strong>{sheets.length}</strong>
</div>
<div>
<small>LAYOUTS</small>
<strong>{layouts.length}</strong>
</div>
<div>
<small>TASKS COMPLETED</small>
<strong>{done}/{tasks.length}</strong>
</div>
</div>
 {tasks.length > 0 && <div className="overview-progress">
<span>Project task progress</span>
<strong>{Math.round(done / tasks.length * 100)}%</strong>
<div>
<i style={{ width: `${done / tasks.length * 100}%` }}/>
</div>
</div>}
 <div className="overview-sections">{groups.map(({ area, title, items, icon: Icon }) => <section key={area} className="overview-section">
<div className="overview-section-head">
<h3>
<Icon size={19}/>
{title}</h3>
<button className="text-btn" onClick={() => open(area, '')}>Open studio <ArrowRight size={15}/>
</button>
</div>{items.length ? items.slice(0, 3).map(item => <button className="overview-resource" key={item.id} onClick={() => open(area, item.id)}>
<span>{item.name}</span>
<ArrowRight size={15}/>
</button>) : <p>No {title.toLowerCase()} yet. Open the studio to create one.</p>}</section>)}<section className="overview-section">
<div className="overview-section-head">
<h3>
<CalendarCheck size={19}/>Planner</h3>
<button className="text-btn" onClick={() => open('Planner', '')}>View tasks <ArrowRight size={15}/>
</button>
</div>{tasks.length ? tasks.slice(0, 4).map(t => <div className="overview-task" key={t.id}>
<span>{t.status === 'Done' ? '✓' : '○'} {t.title}</span>
<small>{t.status}</small>
</div>) : <p>No tasks yet. Add your first task in Planner.</p>}</section>
</div></>;
}
function ProjectGrid({ projects, open, remove, create, update }: {
    projects: Project[];
    open: (p: Project) => void;
    remove: (p: Project) => void;
    create: () => void;
    update?: (f: (v: Data) => Data) => void;
}) { return <div className="project-grid">{projects.map(p => <article className="project-card" key={p.id}>
<button className="project-cover" style={{ background: p.cover ? `url(${p.cover}) center/cover` : p.coverColor || (p.kind === 'Interior' ? '#e9f2ed' : '#eeeaff') }} onClick={() => open(p)}>{!p.cover && <span className={p.coverText ? 'custom-cover-text' : ''}>{p.coverText || (p.kind === 'Interior' ? '⌂' : '✳')}</span>}<em>{p.kind === 'Interior' ? 'Interior' : 'Event'}</em>
</button>
<div className="project-info">
<button onClick={() => open(p)} className="project-name">{p.name}</button>
<button className="icon-btn danger" onClick={() => remove(p)} title="Delete project">
<Trash2 size={16}/>
</button>
<p>{p.type}{p.date ? ' · ' + p.date : ''}</p>{update && <div className="cover-edit-actions">
<label className="mini-action">Change image<input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f)
    readImage(f, src => update(v => ({ ...v, projects: v.projects.map(x => x.id === p.id ? { ...x, cover: src } : x) }))); e.target.value = ''; }}/>
</label>
<label className="mini-action">Color <input type="color" value={p.coverColor || '#eeeaff'} onChange={e => update(v => ({ ...v, projects: v.projects.map(x => x.id === p.id ? { ...x, cover: undefined, coverColor: e.target.value } : x) }))}/>
</label>
<button className="mini-action" onClick={() => { const value = prompt('Text on project card', p.coverText || ''); if (value !== null)
    update(v => ({ ...v, projects: v.projects.map(x => x.id === p.id ? { ...x, cover: undefined, coverText: value } : x) })); }}>Edit text</button>
</div>}</div>
</article>)}<button className="new-card" onClick={create}>
<span>
<Plus size={25}/>
</span>
<strong>Create new project</strong>
<small>Start with a blank canvas</small>
</button>
</div>; }
function PageTitle({ eyebrow, title, desc, action }: {
    eyebrow: string;
    title: string;
    desc: string;
    action?: React.ReactNode;
}) { return <div className="page-heading">
<div>
<span className="eyebrow">{eyebrow}</span>
<h1>{title}</h1>
<p>{desc}</p>
</div>{action}</div>; }
function ProjectSelect({ projects, value, onChange }: {
    projects: Project[];
    value: string;
    onChange: (id: string) => void;
}) { return <select className="field project-select" value={value} onChange={e => onChange(e.target.value)}>
<option value="">Independent / No project</option>{projects.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select>; }
function readImage(file: File, done: (src: string) => void) { if (file.size > 1600000) {
    alert('Please upload an image smaller than 1.6 MB to keep this browser-only prototype responsive.');
    return;
} const reader = new FileReader(); reader.onload = () => { if (typeof reader.result === 'string')
    done(reader.result); }; reader.readAsDataURL(file); }
// Moodboards are freeform canvases: add things, move them, and save a cover preview.
function Moodboards({ data, update, projectId, boardId, setBoardId }: {
    data: Data;
    update: (f: (v: Data) => Data) => void;
    projectId: string;
    boardId: string;
    setBoardId: (id: string) => void;
}) {
    const [newName, setNewName] = useState('');
    const [attach, setAttach] = useState(projectId);
    const [selected, setSelected] = useState('');
    const [tool, setTool] = useState<'select' | 'connect'>('select');
    const [connectFrom, setConnectFrom] = useState('');
    const [zoom, setZoom] = useState(1);
    const canvas = useRef<HTMLDivElement>(null);
    const dragging = useRef<{
        id: string;
        dx: number;
        dy: number;
    } | null>(null);
    const undoStack = useRef<Board[]>([]), redoStack = useRef<Board[]>([]), historyBusy = useRef(false);
    const [guides, setGuides] = useState<{
        x?: number;
        y?: number;
    }>({});
    const [previewSaved, setPreviewSaved] = useState(false);
    // Opening another board should show the regular Save Preview button.
    useEffect(() => setPreviewSaved(false), [boardId]);
    const board = data.boards.find(b => b.id === boardId);
    // Once the board changes, its saved thumbnail is out of date until you save again.
    const updateBoard = (fn: (b: Board) => Board) => { setPreviewSaved(false); update(v => ({ ...v, boards: v.boards.map(b => { if (b.id !== boardId)
            return b; if (!historyBusy.current) {
            undoStack.current.push(structuredClone(b));
            if (undoStack.current.length > 80)
                undoStack.current.shift();
            redoStack.current = [];
        } return fn(b); }) })); };
    const travel = (direction: 'undo' | 'redo') => { const from = direction === 'undo' ? undoStack.current : redoStack.current, to = direction === 'undo' ? redoStack.current : undoStack.current; const previous = from.pop(); if (!previous || !board)
        return; to.push(structuredClone(board)); historyBusy.current = true; update(v => ({ ...v, boards: v.boards.map(b => b.id === boardId ? previous : b) })); historyBusy.current = false; };
    const duplicate = () => { if (!selected || !board)
        return; const n = board.nodes.find(x => x.id === selected); if (!n)
        return; const copy = { ...n, id: uid(), x: n.x + 24, y: n.y + 24 }; updateBoard(b => ({ ...b, nodes: [...b.nodes, copy] })); setSelected(copy.id); };
    const removeSelected = () => { if (!selected)
        return; updateBoard(b => ({ ...b, nodes: b.nodes.filter(n => n.id !== selected), edges: b.edges.filter(e => e.from !== selected && e.to !== selected) })); setSelected(''); };
    const layer = (front: boolean) => { if (!selected)
        return; updateBoard(b => { const node = b.nodes.find(n => n.id === selected); return node ? { ...b, nodes: front ? [...b.nodes.filter(n => n.id !== selected), node] : [node, ...b.nodes.filter(n => n.id !== selected)] } : b; }); };
    // Draw the board onto an invisible canvas so we can export it or save a preview.
    const renderBoardPNG = async () => {
        if (!board)
            return;
        const out = document.createElement('canvas');
        out.width = 1600;
        out.height = 980;
        const ctx = out.getContext('2d');
        if (!ctx)
            return;
        ctx.fillStyle = board.background || '#fafbff';
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.fillStyle = '#d6d9e7';
        for (let x = 0; x < 1600; x += 23)
            for (let y = 0; y < 980; y += 23)
                ctx.fillRect(x, y, 1, 1);
        for (const edge of board.edges) {
            const a = board.nodes.find(n => n.id === edge.from), b = board.nodes.find(n => n.id === edge.to);
            if (!a || !b)
                continue;
            ctx.strokeStyle = '#8686b9';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(a.x + a.w / 2, a.y + a.h / 2);
            ctx.lineTo(b.x + b.w / 2, b.y + b.h / 2);
            ctx.stroke();
        }
        for (const n of board.nodes) {
            if (n.kind !== 'text') {
                ctx.fillStyle = n.color;
                ctx.fillRect(n.x, n.y, n.w, n.h);
            }
            if (n.kind === 'image' && n.src) {
                const img = new Image();
                img.src = n.src;
                await new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); });
                if (img.complete && img.naturalWidth)
                    ctx.drawImage(img, n.x, n.y, n.w, n.h);
            }
            else if (n.kind === 'note' || n.kind === 'text') {
                ctx.fillStyle = n.fontColor || '#24252c';
                ctx.font = `${n.fontSize || 16}px Inter, sans-serif`;
                const lines = n.text.split('\n');
                lines.forEach((line, i) => ctx.fillText(line, n.x + 12, n.y + 35 + i * (n.fontSize || 16) * 1.4, n.w - 24));
            }
        }
        return out;
    };
    const exportPNG = async () => { const out = await renderBoardPNG(); if (!out || !board)
        return; const link = document.createElement('a'); link.download = board.name.replace(/[^a-z0-9-_]/gi, '_') + '.png'; link.href = out.toDataURL('image/png'); link.click(); };
    // This takes a small picture of the canvas for the moodboard card.
    // The actual moodboard keeps saving automatically; this is just its cover image.
    const savePreview = async () => { setPreviewSaved(false); const out = await renderBoardPNG(); if (!out || !board)
        return; const thumbnail = document.createElement('canvas'); thumbnail.width = 480; thumbnail.height = 294; const context = thumbnail.getContext('2d'); if (!context)
        return; context.drawImage(out, 0, 0, thumbnail.width, thumbnail.height); const preview = thumbnail.toDataURL('image/jpeg', 0.72); update(v => ({ ...v, boards: v.boards.map(b => b.id === board.id ? { ...b, preview } : b) })); setPreviewSaved(true); };
    useEffect(() => { const handle = (e: KeyboardEvent) => { if (!boardId || !(document.activeElement instanceof HTMLElement) || document.activeElement.closest('input,textarea,select,[contenteditable=true]'))
        return; const mod = e.ctrlKey || e.metaKey; if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        travel(e.shiftKey ? 'redo' : 'undo');
    }
    else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        travel('redo');
    }
    else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicate();
    }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelected();
    }
    else if (e.key === 'Escape') {
        setSelected('');
        setTool('select');
    } }; window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle); }, [boardId, board, selected]);
    const addNode = (kind: NodeKind, src?: string) => { if (!board)
        return; const node: BoardNode = { id: uid(), kind, x: 110 + board.nodes.length * 22, y: 95 + board.nodes.length * 19, w: kind === 'image' ? 240 : kind === 'highlight' ? 210 : 190, h: kind === 'image' ? 170 : kind === 'highlight' ? 22 : kind === 'text' ? 80 : 125, text: kind === 'note' ? 'Double-click to edit' : kind === 'text' ? 'Your idea here' : '', color: kind === 'note' ? pastel[board.nodes.length % pastel.length] : kind === 'highlight' ? '#f9e5a5' : 'transparent', src, fontColor: '#24252c', fontSize: kind === 'text' ? 22 : 16 }; updateBoard(b => ({ ...b, nodes: [...b.nodes, node] })); setSelected(node.id); };
    const pickNode = (id: string) => { if (tool === 'connect') {
        if (!connectFrom)
            setConnectFrom(id);
        else if (connectFrom !== id) {
            updateBoard(b => ({ ...b, edges: [...b.edges, { id: uid(), from: connectFrom, to: id }] }));
            setConnectFrom('');
            setTool('select');
        }
        return;
    } setSelected(id); };
    const startDrag = (e: React.PointerEvent<HTMLDivElement>, n: BoardNode) => { if (tool !== 'select' || (e.target as HTMLElement).closest('textarea,button,input'))
        return; pickNode(n.id); const rect = canvas.current?.getBoundingClientRect(); if (!rect)
        return; dragging.current = { id: n.id, dx: (e.clientX - rect.left) / zoom - n.x, dy: (e.clientY - rect.top) / zoom - n.y }; e.currentTarget.setPointerCapture(e.pointerId); };
    const move = (e: React.PointerEvent<HTMLDivElement>) => { if (!dragging.current || !canvas.current)
        return; const rect = canvas.current.getBoundingClientRect(); const { id, dx, dy } = dragging.current; let x = Math.max(0, Math.round((e.clientX - rect.left) / zoom - dx)), y = Math.max(0, Math.round((e.clientY - rect.top) / zoom - dy)); const others = board?.nodes.filter(n => n.id !== id) || []; let gx: number | undefined, gy: number | undefined; for (const n of others) {
        if (Math.abs(n.x - x) < 9) {
            x = n.x;
            gx = n.x;
        }
        if (Math.abs(n.y - y) < 9) {
            y = n.y;
            gy = n.y;
        }
    } setGuides({ x: gx, y: gy }); updateBoard(b => ({ ...b, nodes: b.nodes.map(n => n.id === id ? { ...n, x, y } : n) })); };
    const selectedNode = board?.nodes.find(n => n.id === selected);
    return <>
<PageTitle eyebrow="VISUAL THINKING, UNLIMITED POSSIBILITIES" title="Moodboards" desc="A blank canvas for mind maps, inspiration, notes, and everything you're imagining." action={!board ? <button className="primary" onClick={() => { const b: Board = { id: uid(), name: newName.trim() || 'Untitled board', projectId: attach, nodes: [], edges: [] }; update(v => ({ ...v, boards: [b, ...v.boards] })); setBoardId(b.id); setNewName(''); }}>
<Plus size={17}/> New moodboard</button> : <button className="outline" onClick={() => { setBoardId(''); setSelected(''); }}>
<ArrowLeft size={16}/> All moodboards</button>}/>
{!board ? <>
<div className="creation-strip">
<input className="field" placeholder="Name your moodboard (optional)" value={newName} onChange={e => setNewName(e.target.value)}/>
<ProjectSelect projects={data.projects} value={attach} onChange={setAttach}/>
</div>
<div className="library-grid">{data.boards.filter(b => !projectId || b.projectId === projectId).map(b => <button className="library-card" key={b.id} onClick={() => setBoardId(b.id)}>
<span className="library-art" style={{ background: b.preview ? `url(${b.preview}) center / cover no-repeat` : (b.background || pastel[b.nodes.length % pastel.length]) }}>{!b.preview && <Images size={32}/>}</span>
<strong>{b.name}</strong>
<small>{b.nodes.length} elements</small>
</button>)}<button className="library-card create-library" onClick={() => { const b: Board = { id: uid(), name: newName.trim() || 'Untitled board', projectId: attach, nodes: [], edges: [] }; update(v => ({ ...v, boards: [b, ...v.boards] })); setBoardId(b.id); }}>
<Plus size={30}/>
<strong>Blank moodboard</strong>
<small>Start with an empty grid</small>
</button>
</div></> : <>
<div className="editor-top">
<div>
<strong>{board.name}</strong>
<small>{board.nodes.length} elements · Changes saved automatically</small>
</div>
<div className="editor-actions">
<button className="outline" onClick={() => { if (confirm('Delete this moodboard?')) {
        update(v => ({ ...v, boards: v.boards.filter(b => b.id !== board.id) }));
        setBoardId('');
    } }}>
<Trash2 size={15}/> Delete board</button>
</div>
</div>
<div className="board-toolbar">
<label className="canvas-color-control">Canvas color <input aria-label="Moodboard canvas color" type="color" value={board.background || '#fafbff'} onChange={e => updateBoard(b => ({ ...b, background: e.target.value }))}/>
</label>
<button className={tool === 'select' ? 'chosen' : ''} title="Select and drag" onClick={() => { setTool('select'); setConnectFrom(''); }}>
<MousePointer2 size={18}/> Select</button>
<label className="tool-upload">
<Upload size={18}/> Image<input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f)
        readImage(f, src => addNode('image', src)); e.target.value = ''; }}/>
</label>
<button onClick={() => addNode('note')}>
<StickyNote size={18}/> Note</button>
<button onClick={() => addNode('text')}>
<Type size={18}/> Text</button>
<button onClick={() => addNode('highlight')}>
<Highlighter size={18}/> Highlight</button>
<button className={tool === 'connect' ? 'chosen' : ''} onClick={() => { setTool('connect'); setConnectFrom(''); }}>
<MoveRight size={18}/> Arrow</button>
<button title="Undo (Ctrl+Z)" onClick={() => travel('undo')}>
<Undo2 size={17}/> Undo</button>
<button title="Redo (Ctrl+Shift+Z)" onClick={() => travel('redo')}>
<Redo2 size={17}/>
</button>
<button title="Duplicate (Ctrl+D)" onClick={duplicate}>
<Copy size={17}/>
</button>
<button title={previewSaved ? "This moodboard preview has been saved" : "Save current moodboard as library cover"} onClick={savePreview}>{previewSaved ? <Check size={17}/> : <Images size={17}/>} {previewSaved ? "Saved!" : "Save Preview"}</button>
<button title="Export PNG" onClick={exportPNG}>
<ImageDown size={17}/> Export</button>
<div className="toolbar-spacer"/>
<button onClick={() => setZoom(z => Math.max(.5, Math.round((z - .1) * 10) / 10))}>
<ZoomOut size={17}/>
</button>
<span>{Math.round(zoom * 100)}%</span>
<button onClick={() => setZoom(z => Math.min(1.6, Math.round((z + .1) * 10) / 10))}>
<ZoomIn size={17}/>
</button>
</div>{tool === 'connect' && <p className="helper">Click two elements to connect them with an arrow. {connectFrom ? 'Now select the destination.' : 'Select the starting element.'}</p>}{selectedNode && <div className="node-controls">{selectedNode.kind !== 'text' && <label>Note / highlight color <input type="color" value={selectedNode.color} onChange={e => updateBoard(b => ({ ...b, nodes: b.nodes.map(n => n.id === selected ? { ...n, color: e.target.value } : n) }))}/>
</label>}{(selectedNode.kind === 'note' || selectedNode.kind === 'text') && <>
<label>Font color <input type="color" value={selectedNode.fontColor || '#24252c'} onChange={e => updateBoard(b => ({ ...b, nodes: b.nodes.map(n => n.id === selected ? { ...n, fontColor: e.target.value } : n) }))}/>
</label>
<label>Font size <input type="number" min="10" max="72" value={selectedNode.fontSize || 16} onChange={e => updateBoard(b => ({ ...b, nodes: b.nodes.map(n => n.id === selected ? { ...n, fontSize: +e.target.value } : n) }))}/>
</label></>}<label>Width <input type="number" min="70" max="600" value={selectedNode.w} onChange={e => updateBoard(b => ({ ...b, nodes: b.nodes.map(n => n.id === selected ? { ...n, w: +e.target.value } : n) }))}/>
</label>
<label>Height <input type="number" min="20" max="500" value={selectedNode.h} onChange={e => updateBoard(b => ({ ...b, nodes: b.nodes.map(n => n.id === selected ? { ...n, h: +e.target.value } : n) }))}/>
</label>
<button className="outline" title="Move behind all elements" onClick={() => layer(false)}>
<SendToBack size={15}/>
</button>
<button className="outline" title="Bring in front of all elements" onClick={() => layer(true)}>
<BringToFront size={15}/>
</button>
<button className="icon-btn danger" title="Delete element" onClick={() => { updateBoard(b => ({ ...b, nodes: b.nodes.filter(n => n.id !== selected), edges: b.edges.filter(e => e.from !== selected && e.to !== selected) })); setSelected(''); }}>
<Trash2 size={17}/>
</button>
</div>}<div className="board-viewport">
<div ref={canvas} className="board-canvas" style={{ backgroundColor: board.background || '#fafbff', width: 1600, height: 980, transform: `scale(${zoom})`, transformOrigin: 'top left' }} onPointerMove={move} onPointerUp={() => { dragging.current = null; setGuides({}); }} onPointerCancel={() => { dragging.current = null; setGuides({}); }} onClick={e => { if (e.target === e.currentTarget)
        setSelected(''); }}>{guides.x !== undefined && <div className="board-guide vertical" style={{ left: guides.x }}/>}{guides.y !== undefined && <div className="board-guide horizontal" style={{ top: guides.y }}/>}<svg className="edges" width="1600" height="980">
<defs>
<marker id="arrowhead" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
<polygon points="0 0, 9 3.5, 0 7" fill="#8686b9"/>
</marker>
</defs>{board.edges.map(e => { const a = board.nodes.find(n => n.id === e.from), b = board.nodes.find(n => n.id === e.to); return a && b ? <line key={e.id} x1={a.x + a.w / 2} y1={a.y + a.h / 2} x2={b.x + b.w / 2} y2={b.y + b.h / 2} stroke="#8686b9" strokeWidth="2.5" markerEnd="url(#arrowhead)"/> : null; })}</svg>{board.nodes.map(n => <div key={n.id} className={'board-node ' + n.kind + (selected === n.id ? ' selected' : '') + (connectFrom === n.id ? ' connecting' : '')} style={{ left: n.x, top: n.y, width: n.w, height: n.h, background: n.kind === 'image' ? '#fff' : n.color }} onPointerDown={e => startDrag(e, n)} onClick={e => { e.stopPropagation(); pickNode(n.id); }}>{n.kind === 'image' ? <img src={n.src} draggable={false}/> : n.kind === 'highlight' ? <div className="highlight-line"/> : <>
<div className="node-drag-handle" title="Drag to move">⋮⋮ Move</div>
<textarea style={{ color: n.fontColor || '#24252c', fontSize: n.fontSize || 16 }} spellCheck={false} aria-label="Edit board text" value={n.text} onChange={e => updateBoard(b => ({ ...b, nodes: b.nodes.map(x => x.id === n.id ? { ...x, text: e.target.value } : x) }))} onPointerDown={e => e.stopPropagation()}/></>}</div>)}</div>
</div>
<p className="footnote">Drag elements to move them. Edit text directly; select an element to resize or recolor it. Images are stored in this browser.</p></>}</>;
}
// Each spreadsheet stores what you typed; formulas are calculated when cells display.
function Spreadsheets({ data, update, projectId, sheetId, setSheetId }: {
    data: Data;
    update: (f: (v: Data) => Data) => void;
    projectId: string;
    sheetId: string;
    setSheetId: (id: string) => void;
}) { const [attach, setAttach] = useState(projectId); const [name, setName] = useState(''); const [editing, setEditing] = useState(''); const sheet = data.sheets.find(s => s.id === sheetId); const change = (r: number, c: number, val: string) => update(v => ({ ...v, sheets: v.sheets.map(s => s.id === sheetId ? { ...s, cells: { ...s.cells, [`${r}:${c}`]: val } } : s) })); const addSheet = (t: typeof templates[number]) => { const s: Sheet = { id: uid(), name: name.trim() || t.name, projectId: attach, color: t.color, cells: makeCells(t.rows) }; update(v => ({ ...v, sheets: [s, ...v.sheets] })); setSheetId(s.id); setName(''); }; return <>
<PageTitle eyebrow="ORGANIZE THE NUMBERS" title="Spreadsheets" desc="Flexible, colorful sheets for budgets, shopping lists, and creative planning." action={sheet ? <button className="outline" onClick={() => setSheetId('')}>
<ArrowLeft size={16}/> All spreadsheets</button> : undefined}/>
{!sheet ? <>
<div className="creation-strip">
<input className="field" placeholder="Spreadsheet name (optional)" value={name} onChange={e => setName(e.target.value)}/>
<ProjectSelect projects={data.projects} value={attach} onChange={setAttach}/>
</div>
<h3 className="subheading">Start with a template</h3>
<div className="template-grid">{templates.map(t => <button key={t.name} className="template-card" onClick={() => addSheet(t)}>
<div style={{ background: t.color }} className="template-preview">{Array.from({ length: 12 }, (_, i) => <span key={i}/>)}</div>
<strong>{t.name}</strong>
<small>Click to create</small>
</button>)}</div>{data.sheets.length > 0 && <>
<h3 className="subheading">Your spreadsheets</h3>
<div className="library-grid">{data.sheets.filter(s => !projectId || s.projectId === projectId).map(s => <button className="library-card" key={s.id} onClick={() => setSheetId(s.id)}>
<span className="library-art" style={{ background: s.color }}>
<Table2 size={30}/>
</span>
<strong>{s.name}</strong>
<small>Editable sheet</small>
</button>)}</div></>}</> : <>
<div className="editor-top">
<div>
<strong>{sheet.name}</strong>
<small>Click a cell to edit · Try =SUM(C2:C8), =AVERAGE(C2:C8), =C2*D2 or =2+3</small>
</div>
<div className="editor-actions">
<button className="outline" onClick={() => { const lines = Array.from({ length: 25 }, (_, r) => Array.from({ length: 8 }, (_, c) => '"' + (sheet.cells[`${r}:${c}`] || '').replace(/"/g, '""') + '"').join(',')); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = sheet.name + '.csv'; a.click(); URL.revokeObjectURL(a.href); }}>
<Download size={16}/> Export CSV</button>
<button className="outline danger" onClick={() => { if (confirm('Delete spreadsheet?')) {
    update(v => ({ ...v, sheets: v.sheets.filter(s => s.id !== sheet.id) }));
    setSheetId('');
} }}>
<Trash2 size={16}/>
</button>
</div>
</div>
<div className="sheet-scroll">
<table className="spreadsheet">
<thead>
<tr>
<th>
</th>{Array.from({ length: 8 }, (_, c) => <th key={c} style={{ background: sheet.color }}>{String.fromCharCode(65 + c)}</th>)}</tr>
</thead>
<tbody>{Array.from({ length: 25 }, (_, r) => <tr key={r}>
<th>{r + 1}</th>{Array.from({ length: 8 }, (_, c) => { const k = `${r}:${c}`, raw = sheet.cells[k] || ''; return <td key={c}>{editing === k ? <input autoFocus value={raw} onBlur={() => setEditing('')} onChange={e => change(r, c, e.target.value)} onKeyDown={e => { if (e.key === 'Enter')
    setEditing(''); }}/> : <button onClick={() => setEditing(k)}>{calcCell(raw, sheet.cells) || '\u00a0'}</button>}</td>; })}</tr>)}</tbody>
</table>
</div>
<p className="footnote">Spreadsheet prototype supports editable cells, cell references, arithmetic, SUM, AVERAGE, MIN, MAX and COUNT formulas, and CSV export. It is not a complete Google Sheets replacement.</p></>}</>; }
const taskCategoryColors: Record<string, string> = { General: '#e8e9ff', Design: '#fbe6ed', Shopping: '#e7f3e9', Venue: '#fff0d9', Decor: '#eadcfb', Logistics: '#dceef7', Other: '#ededf1' };
function taskColor(t: Pick<Task, 'category' | 'priority'>, mode: 'category' | 'priority') { return mode === 'priority' ? ({ Low: '#d7f0dc', Medium: '#ffe8ac', High: '#ffd0d8' }[t.priority]) : taskCategoryColors[t.category || 'General'] || '#e8e9ff'; }
// Tasks can be viewed as a board, list, or color-coded calendar.
function Planner({ data, update, projectId }: {
    data: Data;
    update: (f: (v: Data) => Data) => void;
    projectId: string;
}) { const [view, setView] = useState<'Board' | 'List' | 'Calendar'>('Board'); const [title, setTitle] = useState(''); const [date, setDate] = useState(''); const [priority, setPriority] = useState<Task['priority']>('Medium'); const [category, setCategory] = useState('General'); const [colorMode, setColorMode] = useState<'category' | 'priority'>('category'); const [attach, setAttach] = useState(projectId); const [month, setMonth] = useState(() => new Date()); const tasks = data.tasks.filter(t => !projectId || t.projectId === projectId); const add = () => { if (!title.trim())
    return; const t: Task = { id: uid(), title: title.trim(), date, projectId: attach, status: 'To do', priority, category }; update(v => ({ ...v, tasks: [t, ...v.tasks] })); setTitle(''); }; const change = (id: string, patch: Partial<Task>) => update(v => ({ ...v, tasks: v.tasks.map(t => t.id === id ? { ...t, ...patch } : t) })); const remove = (id: string) => update(v => ({ ...v, tasks: v.tasks.filter(t => t.id !== id) })); const taskRow = (t: Task) => <div className="task-row" key={t.id}>
<button className={'task-check ' + (t.status === 'Done' ? 'done' : '')} onClick={() => change(t.id, { status: t.status === 'Done' ? 'To do' : 'Done' })}>{t.status === 'Done' && <Check size={13}/>}</button>
<span className={t.status === 'Done' ? 'done-text' : ''}>{t.title}</span>
<span className={'priority ' + t.priority.toLowerCase()}>{t.priority}</span>
<input type="date" value={t.date} onChange={e => change(t.id, { date: e.target.value })}/>
<select value={t.status} onChange={e => change(t.id, { status: e.target.value as Task['status'] })}>
<option>To do</option>
<option>In progress</option>
<option>Done</option>
</select>
<button className="icon-btn danger" onClick={() => remove(t.id)}>
<Trash2 size={15}/>
</button>
</div>; const y = month.getFullYear(), m = month.getMonth(), offset = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(); return <>
<PageTitle eyebrow="YOUR PLANS, YOUR PACE" title="Planner" desc="A calm place for tasks, deadlines, and everything you need to remember."/>
<div className="planner-tabs">{([['Board', Columns3], ['List', List], ['Calendar', CalendarDays]] as const).map(([v, Icon]) => <button key={v} className={view === v ? 'selected' : ''} onClick={() => setView(v)}>
<Icon size={17}/>
{v}</button>)}</div>
<form className="task-form" onSubmit={e => { e.preventDefault(); add(); }}>
<input className="field" placeholder="What needs to get done?" value={title} onChange={e => setTitle(e.target.value)}/>
<input className="field" type="date" value={date} onChange={e => setDate(e.target.value)}/>
<select className="field" value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}>
<option>Low</option>
<option>Medium</option>
<option>High</option>
</select>
<select className="field" aria-label="Task category" value={category} onChange={e => setCategory(e.target.value)}>{['General', 'Design', 'Shopping', 'Venue', 'Decor', 'Logistics', 'Other'].map(c => <option key={c}>{c}</option>)}</select>
<ProjectSelect projects={data.projects} value={attach} onChange={setAttach}/>
<button className="primary" type="submit">
<Plus size={16}/> Add task</button>
</form>{view === 'Board' ? <div className="kanban">{(['To do', 'In progress', 'Done'] as const).map((status, i) => <div className="kanban-col" key={status}>
<h3>
<span style={{ background: pastel[i] }}/>
{status} <small>{tasks.filter(t => t.status === status).length}</small>
</h3>{tasks.filter(t => t.status === status).map(t => <div className="kanban-task" key={t.id}>
<strong>{t.title}</strong>
<div>
<span className={'priority ' + t.priority.toLowerCase()}>{t.priority}</span>
<small>{t.date || 'No due date'}</small>
</div>
<select value={t.status} onChange={e => change(t.id, { status: e.target.value as Task['status'] })}>
<option>To do</option>
<option>In progress</option>
<option>Done</option>
</select>
<button className="icon-btn danger" onClick={() => remove(t.id)}>
<Trash2 size={15}/>
</button>
</div>)}</div>)}</div> : view === 'List' ? <div className="task-list">{tasks.length ? tasks.map(taskRow) : <div className="empty-message">No tasks yet. Add one above to get started.</div>}</div> : <div className="calendar-panel">
<div className="calendar-color-settings">
<label>Color tasks by <select value={colorMode} onChange={e => setColorMode(e.target.value as 'category' | 'priority')}>
<option value="category">Task type</option>
<option value="priority">Priority</option>
</select>
</label>
<div className="calendar-legend">{(colorMode === 'priority' ? ['Low', 'Medium', 'High'] : ['General', 'Design', 'Shopping', 'Venue', 'Decor', 'Logistics', 'Other']).map(c => <span key={c}>
<i style={{ background: taskColor({ category: c, priority: c as Task['priority'] }, colorMode) }}/>
{c}</span>)}</div>
</div>
<div className="calendar-header">
<button className="outline" onClick={() => setMonth(new Date(y, m - 1, 1))}>
<ArrowLeft size={16}/>
</button>
<h3>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
<button className="outline" onClick={() => setMonth(new Date(y, m + 1, 1))}>
<ArrowRight size={16}/>
</button>
</div>
<div className="calendar-grid">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div className="calendar-day-label" key={d}>{d}</div>)}{Array.from({ length: offset }, (_, i) => <div key={'pad' + i} className="calendar-cell faded"/>)}{Array.from({ length: days }, (_, i) => { const day = `${y}-${String(m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`; return <div className="calendar-cell" key={day}>
<span>{i + 1}</span>{tasks.filter(t => t.date === day).map(t => <button key={t.id} className="calendar-event" style={{ background: taskColor(t, colorMode), color: '#273044' }} title={`${t.title} · ${t.category || 'General'} · ${t.priority}`} onClick={() => change(t.id, { status: t.status === 'Done' ? 'To do' : 'Done' })}>{t.title}</button>)}</div>; })}</div>
</div>}</>; }
// The layout canvas lets you place, move, and resize furniture and event objects.
function Layouts({ data, update, projectId, layoutId, setLayoutId }: {
    data: Data;
    update: (f: (v: Data) => Data) => void;
    projectId: string;
    layoutId: string;
    setLayoutId: (id: string) => void;
}) {
    const [attach, setAttach] = useState(projectId), [name, setName] = useState(''), [selected, setSelected] = useState('');
    const interaction = useRef<{
        id: string;
        mode: 'move' | 'resize';
        sx: number;
        sy: number;
        ox: number;
        oy: number;
        ow: number;
        oh: number;
    } | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const doc = data.layouts.find(l => l.id === layoutId);
    const change = (fn: (l: LayoutDoc) => LayoutDoc) => update(v => ({ ...v, layouts: v.layouts.map(l => l.id === layoutId ? fn(l) : l) }));
    const defaults: Record<string, [
        number,
        number
    ]> = { Sofa: [180, 78], Bed: [155, 200], Desk: [115, 65], "Round Table": [110, 110], "Rectangular Table": [165, 85], Chair: [58, 62], Plant: [55, 55], "Rectangular Rug": [205, 145], "Round Rug": [145, 145], Lamp: [42, 42], Entryway: [95, 34], "Decor Station": [90, 65], "Gift Table": [120, 70], "Food Station": [150, 80], "Dance Floor": [180, 180], "Photo Booth": [110, 90], "Stage": [180, 95] };
    const add = (kind: string) => change(l => ({ ...l, items: [...l.items, { id: uid(), kind, x: 30 + Math.random() * 25, y: 30 + Math.random() * 25, w: defaults[kind][0], h: defaults[kind][1], rotation: 0 }] }));
    const updateItem = (id: string, patch: Partial<LayoutItem>) => change(l => ({ ...l, items: l.items.map(it => it.id === id ? { ...it, ...patch } : it) }));
    const begin = (e: React.PointerEvent<HTMLDivElement>, it: LayoutItem, mode: 'move' | 'resize') => { e.preventDefault(); e.stopPropagation(); setSelected(it.id); interaction.current = { id: it.id, mode, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y, ow: it.w || 100, oh: it.h || 70 }; e.currentTarget.setPointerCapture(e.pointerId); };
    const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => { const d = interaction.current, r = ref.current?.getBoundingClientRect(); if (!d || !r)
        return; const dx = e.clientX - d.sx, dy = e.clientY - d.sy; if (d.mode === 'resize')
        updateItem(d.id, { w: Math.max(30, Math.round(d.ow + dx / r.width * (doc?.roomWidth || 20) * 35)), h: Math.max(30, Math.round(d.oh + dy / r.height * (doc?.roomHeight || 15) * 35)) });
    else
        updateItem(d.id, { x: Math.max(0, Math.min(100, (doc?.snap ? Math.round((d.ox + dx / r.width * 100) * (doc.roomWidth || 20) * 2 / 100) * 100 / ((doc.roomWidth || 20) * 2) : d.ox + dx / r.width * 100))), y: Math.max(0, Math.min(100, (doc?.snap ? Math.round((d.oy + dy / r.height * 100) * (doc.roomHeight || 15) * 2 / 100) * 100 / ((doc.roomHeight || 15) * 2) : d.oy + dy / r.height * 100))) }); };
    const active = doc?.items.find(i => i.id === selected);
    return <>
<PageTitle eyebrow="IMAGINE YOUR SPACE" title="Layout Studio" desc="Upload a floor plan or photo, then arrange and resize furniture from above." action={doc ? <button className="outline" onClick={() => { setLayoutId(''); setSelected(''); }}>
<ArrowLeft size={16}/> All layouts</button> : undefined}/>
{!doc ? <>
<div className="creation-strip">
<input className="field" placeholder="Layout name (optional)" value={name} onChange={e => setName(e.target.value)}/>
<ProjectSelect projects={data.projects} value={attach} onChange={setAttach}/>
<button className="primary" onClick={() => { const l: LayoutDoc = { id: uid(), name: name.trim() || 'Untitled layout', projectId: attach, items: [], opacity: 0.5, roomWidth: 20, roomHeight: 15, snap: true }; update(v => ({ ...v, layouts: [l, ...v.layouts] })); setLayoutId(l.id); setName(''); }}>
<Plus size={17}/> New layout</button>
</div>
<div className="library-grid">{data.layouts.filter(l => !projectId || l.projectId === projectId).map(l => <button className="library-card" key={l.id} onClick={() => setLayoutId(l.id)}>
<span className="library-art" style={{ background: pastel[2] }}>
<Ruler size={30}/>
</span>
<strong>{l.name}</strong>
<small>{l.items.length} objects</small>
</button>)}</div>{data.layouts.length === 0 && <div className="empty-message">Create your first layout to start planning a space.</div>}</> : <>
<div className="editor-top">
<div>
<strong>{doc.name}</strong>
<small>Visual floor planner · Room and furniture dimensions in feet</small>
</div>
<button className="outline danger" onClick={() => { if (confirm('Delete layout?')) {
        update(v => ({ ...v, layouts: v.layouts.filter(l => l.id !== doc.id) }));
        setLayoutId('');
    } }}>
<Trash2 size={16}/> Delete</button>
</div>
<div className="layout-workspace">
<div className="layout-sidebar">
<h3>Canvas background</h3>
<label className="upload-box">
<Upload size={23}/>
<span>Upload photo or floor plan</span>
<input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f)
        readImage(f, src => change(l => ({ ...l, background: src, photo: src }))); e.target.value = ''; }}/>
</label>{doc.background && <>
<label className="layout-control">Background opacity <input type="range" min="0" max="1" step="0.05" value={doc.opacity ?? 0.5} onChange={e => change(l => ({ ...l, opacity: +e.target.value }))}/>
</label>
<button className="outline" onClick={() => change(l => ({ ...l, background: undefined }))}>Remove background</button></>}{doc.photo && <img className="room-reference" src={doc.photo} alt="Room reference"/>}<h3>Room dimensions</h3>
<div className="room-dimensions">
<label>Width (ft)<input type="number" min="4" max="100" step="0.5" value={doc.roomWidth || 20} onChange={e => change(l => ({ ...l, roomWidth: Math.max(4, +e.target.value || 4) }))}/>
</label>
<label>Length (ft)<input type="number" min="4" max="100" step="0.5" value={doc.roomHeight || 15} onChange={e => change(l => ({ ...l, roomHeight: Math.max(4, +e.target.value || 4) }))}/>
</label>
</div>
<label className="snap-toggle">
<input type="checkbox" checked={doc.snap !== false} onChange={e => change(l => ({ ...l, snap: e.target.checked }))}/>
<Grid3X3 size={15}/> Snap to 6-inch grid</label>
<h3>Furniture & event elements</h3>
<p className="footnote">Add rugs, tables, an entryway, decor, and event zones.</p>{Object.keys(defaults).map(k => <button className="object-option" key={k} onClick={() => add(k)}>
<Plus size={16}/>
{k}</button>)}{active && <div className="object-inspector">
<h3>Selected: {active.kind}</h3>
<label>Width (ft)<input type="number" min="0.5" step="0.5" value={+((active.w || 100) / 35).toFixed(2)} onChange={e => updateItem(active.id, { w: Math.max(17.5, +e.target.value * 35) })}/>
</label>
<label>Length (ft)<input type="number" min="0.5" step="0.5" value={+((active.h || 70) / 35).toFixed(2)} onChange={e => updateItem(active.id, { h: Math.max(17.5, +e.target.value * 35) })}/>
</label>
<label>Rotation (°)<input type="number" value={active.rotation || 0} onChange={e => updateItem(active.id, { rotation: +e.target.value })}/>
</label>
<button className="outline" onClick={() => change(l => ({ ...l, items: l.items.filter(x => x.id !== active.id) }))}>Remove object</button>
</div>}</div>
<div className="layout-stage" style={{ aspectRatio: `${doc.roomWidth || 20} / ${doc.roomHeight || 15}`, height: "auto", minHeight: 320 }} ref={ref} onPointerMove={pointerMove} onPointerUp={() => interaction.current = null} onPointerCancel={() => interaction.current = null} onClick={() => setSelected('')}>
<span className="layout-watermark">YOUR SPACE</span>{doc.background && <img className="layout-background" src={doc.background} alt="Layout background" draggable={false} style={{ opacity: doc.opacity ?? 0.5 }}/>}{doc.items.map(it => <div className={'furniture-object ' + (selected === it.id ? 'is-selected' : '')} key={it.id} style={{ left: it.x + '%', top: it.y + '%', width: `${((it.w || 100) / 35) / (doc.roomWidth || 20) * 100}%`, height: `${((it.h || 70) / 35) / (doc.roomHeight || 15) * 100}%`, transform: `translate(-50%,-50%) rotate(${it.rotation || 0}deg)` }} onPointerDown={e => begin(e, it, 'move')} onClick={e => { e.stopPropagation(); setSelected(it.id); }}>
<FurnitureShape kind={it.kind}/>
<span className="furniture-label">{it.kind}</span>
<button className="furniture-remove" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); change(l => ({ ...l, items: l.items.filter(x => x.id !== it.id) })); }}>
<X size={12}/>
</button>{selected === it.id && <div className="furniture-resize" title="Drag to resize" onPointerDown={e => begin(e, it, 'resize')}/>}</div>)}</div>
</div>
<p className="footnote">Drag to move; select an object and drag its lower-right handle to resize. Furniture is shown from above. Room and furniture measurements use a proportional feet-based scale. Resize handles can also adjust furniture visually.</p></>}</>;
}
function FurnitureShape({ kind }: {
    kind: string;
}) { return <div className={'shape shape-' + kind.toLowerCase().replace(/[^a-z]+/g, '-')}>{kind === 'Sofa' ? <>
<i />
<b />
<i /></> : kind === 'Bed' ? <>
<i />
<i />
<b /></> : kind === 'Desk' ? <>
<b />
<i /></> : kind === 'Chair' ? <>
<b />
<i /></> : kind.includes('Table') ? <b /> : kind.includes('Rug') ? <>
<i />
<i /></> : kind === 'Plant' ? <>
<i />
<i />
<i /></> : <b />}</div>; }
