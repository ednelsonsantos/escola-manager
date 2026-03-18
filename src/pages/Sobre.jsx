import React, { useState } from 'react'
import {
  Heart, Code2, Github, Mail, Shield, Star,
  BookOpen, Users, DollarSign, Calendar, BarChart2,
  ChevronDown, ChevronUp, ExternalLink, Copy, Check
} from 'lucide-react'

const AUTOR = {
  nome:    'Ednelson Santos',
  github:  'https://github.com/ednelsonsantos',
  email:   'ednelson@email.com',
  papel:   'Criador e desenvolvedor principal',
  avatar:  'ES',
  cor:     '#63dcaa',
}

const VERSAO = '5.5.1'
const ANO    = '2025'

const MODULOS = [
  { icon: LayoutDashboardIcon, label: 'Dashboard',      desc: 'KPIs, gráficos e visão geral financeira' },
  { icon: UsersIcon,           label: 'Alunos',         desc: 'Cadastro completo, ficha e histórico de pagamentos' },
  { icon: DollarSignIcon,      label: 'Financeiro',     desc: 'Mensalidades, recibos, relatórios e exportação' },
  { icon: BookOpenIcon,        label: 'Cursos',         desc: 'Turmas, professores e ocupação' },
  { icon: BarChart2Icon,       label: 'Relatórios',     desc: 'Análise detalhada com exportação CSV/JSON' },
  { icon: CalendarIcon,        label: 'Agenda',         desc: 'Calendário de eventos e atividades' },
  { icon: ShieldIcon,          label: 'Usuários',       desc: 'Contas, perfis e controle de acesso' },
  { icon: ShieldIcon,          label: 'Log de Auditoria', desc: 'Histórico completo de ações do sistema' },
]

// Ícones como componentes simples para não precisar importar tudo
function LayoutDashboardIcon() { return <span style={{fontSize:16}}>📊</span> }
function UsersIcon()           { return <span style={{fontSize:16}}>👥</span> }
function DollarSignIcon()      { return <span style={{fontSize:16}}>💰</span> }
function BookOpenIcon()        { return <span style={{fontSize:16}}>📚</span> }
function BarChart2Icon()       { return <span style={{fontSize:16}}>📈</span> }
function CalendarIcon()        { return <span style={{fontSize:16}}>📅</span> }
function ShieldIcon()          { return <span style={{fontSize:16}}>🔐</span> }

const DEPS = [
  { nome:'React 18',         licenca:'MIT', uso:'Interface de usuário' },
  { nome:'Electron 29',      licenca:'MIT', uso:'App desktop multiplataforma' },
  { nome:'better-sqlite3',   licenca:'MIT', uso:'Banco de dados local' },
  { nome:'Chart.js',         licenca:'MIT', uso:'Gráficos financeiros' },
  { nome:'Vite',             licenca:'MIT', uso:'Build e desenvolvimento' },
  { nome:'Lucide React',     licenca:'ISC', uso:'Ícones da interface' },
  { nome:'React Router',     licenca:'MIT', uso:'Navegação entre páginas' },
]

const HISTORICO = [
  { versao:'5.5.1', data:'Mar/2025', destaques:[
    'Fix: tamanho de texto agora usa CSS zoom — escala fontes, espaçamentos e ícones',
    'Fix: painel de notificações ficava atrás do conteúdo (overflow: hidden no topbar)',
    'Z-index dos painéis elevado para 1000',
  ]},
  { versao:'5.4.x', data:'Mar/2025', destaques:[
    'Fix: "reload" visual ao abrir notificações — Guarded movido para fora de App(), AppRoutes memoizado',
    'Fix: tela preta pós-login no .exe — flags disable-features quebravam contextIsolation',
    'Fix: mesAtualDinamico not defined no Dashboard',
    'Fix: porta 5173 já em uso — dev-runner.js detecta porta livre automaticamente',
    'Fix: chave duplicada no PAGE_META impedia build',
    'ErrorBoundary adicionado — erros exibem mensagem em vez de tela preta',
    'Fix: notificações com clique recarregando tela — stopPropagation + memoização',
  ]},
  { versao:'5.4.0', data:'Mar/2025', destaques:[
    'Geração de PDF nativa (Electron printToPDF) — boleto, relatório financeiro, alunos, frequência',
    'Cobrança via WhatsApp (wa.me deeplink) — sem servidor externo',
    'src/utils/pdfUtils.js — templates profissionais de PDF',
  ]},
  { versao:'5.3.0', data:'Mar/2025', destaques:[
    'Módulo de Frequência (/frequencia) — chamada por turma/aula, SQLite, relatório PDF',
    'Cálculo automático de juros e multa por atraso',
    'Fix: datas hardcoded substituídas por mesAtualDinamico()',
    'Fix: migração do schema SQLite (turma_ls_id)',
  ]},
  { versao:'5.2.0', data:'Mar/2025', destaques:[
    'Restaurar backup — seletor de arquivo, modal de confirmação, validação JSON',
    'Fix: toggle de notificações agora suprime badges de verdade',
    'Fix: accentColor agora aplicada via CSS custom property --accent',
    'Auditoria completa de configurações — status real de cada setting',
  ]},
  { versao:'5.1.x', data:'Jan/2025', destaques:[
    'Backup automático real ao fechar o app (IPC + JSON em AppData)',
    'Telas dedicadas para Alunos, Usuários, Cursos e Agenda',
    'Log de Auditoria completo com SQLite',
    'Botões de janela estilo Windows na topbar e login',
    'Fix: localStorage isolado dev vs prod',
  ]},
  { versao:'5.0.0', data:'Dez/2024', destaques:[
    'SQLite via better-sqlite3',
    'Sistema de usuários e perfis com permissões por módulo',
    'Identidade visual personalizada (logo, nome, slogan)',
    'Controle de acesso por módulo',
  ]},
  { versao:'4.0.0', data:'Nov/2024', destaques:[
    'Página de Relatórios com exportação CSV contextual',
    'Agenda e calendário de eventos',
    'Busca global Ctrl+K',
    'Recibos imprimíveis',
  ]},
  { versao:'3.0.0', data:'Out/2024', destaques:[
    'Tema claro/escuro',
    'Dashboard com gráficos Chart.js',
    'CRUD completo de alunos, turmas e professores',
    'Geração automática de mensalidades',
  ]},
  { versao:'1.0.0', data:'Set/2024', destaques:[
    'Lançamento inicial',
    'Dashboard básico',
    'Listagem de alunos',
  ]},
]

const LICENCA_TEXTO = `GNU General Public License v3.0 (GPL-3.0)

Você tem liberdade para:
  ✅ Usar o software gratuitamente para qualquer finalidade
  ✅ Estudar e modificar o código-fonte
  ✅ Distribuir cópias gratuitamente
  ✅ Distribuir versões modificadas (com código-fonte aberto)
  ✅ Cobrar por suporte, treinamento ou hospedagem

Sob as seguintes condições:
  📌 Qualquer versão modificada distribuída deve ter o código-fonte publicado
  📌 A mesma licença GPL-3.0 deve ser mantida
  📌 Os avisos de copyright devem ser preservados

Proibido:
  ❌ Fechar o código e distribuir como software proprietário
  ❌ Remover os créditos do autor original

SPDX-License-Identifier: GPL-3.0-or-later
Texto completo: https://www.gnu.org/licenses/gpl-3.0.txt`

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handle() {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={handle} className="btn btn-ghost btn-xs" title="Copiar">
      {copied ? <Check size={12} style={{color:'var(--accent)'}}/> : <Copy size={12}/>}
    </button>
  )
}

export default function Sobre() {
  const [showDeps,    setShowDeps]    = useState(false)
  const [showHistorico, setShowHistorico] = useState(false)
  const [showLicenca, setShowLicenca] = useState(false)

  return (
    <div className="fade-up" style={{maxWidth:860,margin:'0 auto'}}>

      {/* ── HERO ── */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:18, padding:'36px 36px 28px',
        textAlign:'center', marginBottom:16,
        position:'relative', overflow:'hidden',
      }}>
        {/* Fundo decorativo */}
        <div style={{
          position:'absolute', top:-60, right:-60,
          width:220, height:220, borderRadius:'50%',
          background:'radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)',
          pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute', bottom:-60, left:-60,
          width:180, height:180, borderRadius:'50%',
          background:'radial-gradient(circle, var(--blu-dim) 0%, transparent 70%)',
          pointerEvents:'none',
        }}/>

        <div style={{
          width:72, height:72, borderRadius:20, margin:'0 auto 18px',
          background:'linear-gradient(135deg, var(--accent), var(--blue))',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:32, boxShadow:'0 8px 28px var(--accent-glow)',
        }}>🎓</div>

        <h1 style={{
          fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800,
          color:'var(--text-1)', letterSpacing:-1, marginBottom:8,
        }}>Escola Manager</h1>

        <p style={{fontSize:14, color:'var(--text-3)', marginBottom:18, maxWidth:460, margin:'0 auto 18px'}}>
          Sistema de gestão completo para escolas de idiomas — gratuito, open source e feito com ❤️ no Brasil.
        </p>

        <div style={{display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap'}}>
          <span className="badge bg-green" style={{fontSize:12, padding:'5px 12px'}}>
            <Star size={12}/> v{VERSAO}
          </span>
          <span className="badge bg-blue" style={{fontSize:12, padding:'5px 12px'}}>
            <Shield size={12}/> GPL-3.0 · Free to Use
          </span>
          <span className="badge bg-gray" style={{fontSize:12, padding:'5px 12px'}}>
            <Code2 size={12}/> Open Source
          </span>
        </div>
      </div>

      {/* ── AUTOR ── */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:14, padding:'22px 24px', marginBottom:16,
      }}>
        <div style={{
          fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
          color:'var(--text-3)', textTransform:'uppercase', letterSpacing:.8,
          marginBottom:16,
        }}>Criado por</div>

        <div style={{display:'flex', alignItems:'center', gap:16}}>
          <div style={{
            width:56, height:56, borderRadius:'50%', flexShrink:0,
            background:`linear-gradient(135deg, ${AUTOR.cor}, var(--blue))`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:'#fff',
            boxShadow:`0 4px 16px ${AUTOR.cor}44`,
          }}>
            {AUTOR.avatar}
          </div>

          <div style={{flex:1}}>
            <div style={{
              fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700,
              color:'var(--text-1)', letterSpacing:-.3,
            }}>
              {AUTOR.nome}
            </div>
            <div style={{fontSize:13, color:'var(--text-3)', marginTop:3}}>
              {AUTOR.papel}
            </div>
            <div style={{display:'flex', gap:10, marginTop:10, flexWrap:'wrap'}}>
              <a href={AUTOR.github} target="_blank" rel="noreferrer"
                style={{
                  display:'inline-flex', alignItems:'center', gap:6,
                  padding:'5px 12px', borderRadius:8,
                  background:'var(--bg-hover)', border:'1px solid var(--border)',
                  color:'var(--text-2)', fontSize:12, fontWeight:500,
                  textDecoration:'none', transition:'all .15s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border-focus)';e.currentTarget.style.color='var(--text-1)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text-2)'}}
              >
                <Github size={13}/> GitHub
                <ExternalLink size={10} style={{opacity:.5}}/>
              </a>
              <a href={`mailto:${AUTOR.email}`}
                style={{
                  display:'inline-flex', alignItems:'center', gap:6,
                  padding:'5px 12px', borderRadius:8,
                  background:'var(--bg-hover)', border:'1px solid var(--border)',
                  color:'var(--text-2)', fontSize:12, fontWeight:500,
                  textDecoration:'none', transition:'all .15s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border-focus)';e.currentTarget.style.color='var(--text-1)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text-2)'}}
              >
                <Mail size={13}/> Contato
              </a>
            </div>
          </div>

          <div style={{
            textAlign:'right', padding:'12px 16px',
            background:'var(--accent-dim)', borderRadius:10,
            border:'1px solid var(--border-accent)',
          }}>
            <div style={{fontSize:11, color:'var(--accent)', fontWeight:700, textTransform:'uppercase', letterSpacing:.6, marginBottom:3}}>
              Copyright
            </div>
            <div style={{fontSize:13, color:'var(--text-1)', fontWeight:600}}>
              © {ANO} {AUTOR.nome}
            </div>
            <div style={{fontSize:11, color:'var(--text-3)', marginTop:2}}>
              Todos os direitos reservados
            </div>
          </div>
        </div>
      </div>

      {/* ── LICENÇA ── */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:14, padding:'20px 24px', marginBottom:16,
      }}>
        <div
          onClick={() => setShowLicenca(v => !v)}
          style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            cursor:'pointer', userSelect:'none',
          }}
        >
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <div style={{
              width:40, height:40, borderRadius:10,
              background:'var(--accent-dim)', display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <Shield size={18} style={{color:'var(--accent)'}}/>
            </div>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:'var(--text-1)'}}>
                Licença de Uso
              </div>
              <div style={{fontSize:12, color:'var(--text-3)', marginTop:1}}>
                GNU General Public License v3.0 — Free to Use Forever
              </div>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span className="badge bg-green" style={{fontSize:11}}>GPL-3.0</span>
            {showLicenca ? <ChevronUp size={16} style={{color:'var(--text-3)'}}/> : <ChevronDown size={16} style={{color:'var(--text-3)'}}/> }
          </div>
        </div>

        {!showLicenca && (
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10,
            marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)',
          }}>
            {[
              { emoji:'✅', titulo:'Uso gratuito', desc:'Para qualquer finalidade, sempre' },
              { emoji:'✅', titulo:'Código aberto', desc:'Estude, modifique e distribua' },
              { emoji:'✅', titulo:'Contribua', desc:'Melhorias bem-vindas no GitHub' },
              { emoji:'❌', titulo:'Fechar código', desc:'Não pode distribuir versão proprietária' },
              { emoji:'❌', titulo:'Vender como seu', desc:'Créditos do autor devem ser mantidos' },
              { emoji:'📌', titulo:'Copyleft', desc:'Versões modificadas mantêm a GPL-3.0' },
            ].map(item => (
              <div key={item.titulo} style={{
                padding:'12px 14px', background:'var(--bg-hover)',
                borderRadius:9, display:'flex', gap:10, alignItems:'flex-start',
              }}>
                <span style={{fontSize:18, lineHeight:1, flexShrink:0, marginTop:1}}>{item.emoji}</span>
                <div>
                  <div style={{fontSize:12.5, fontWeight:600, color:'var(--text-1)'}}>{item.titulo}</div>
                  <div style={{fontSize:11, color:'var(--text-3)', marginTop:2}}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showLicenca && (
          <div style={{marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
              <span style={{fontSize:12, color:'var(--text-3)'}}>Texto completo da licença</span>
              <CopyButton text={LICENCA_TEXTO}/>
            </div>
            <pre style={{
              background:'var(--bg-hover)', borderRadius:9, padding:'16px',
              fontSize:12, lineHeight:1.7, color:'var(--text-2)',
              whiteSpace:'pre-wrap', fontFamily:"'DM Mono','Fira Mono',monospace",
              border:'1px solid var(--border)', overflowX:'auto',
            }}>
              {LICENCA_TEXTO}
            </pre>
            <div style={{marginTop:12, display:'flex', gap:8}}>
              <a href="https://www.gnu.org/licenses/gpl-3.0.txt" target="_blank" rel="noreferrer"
                className="btn btn-secondary btn-sm">
                <ExternalLink size={12}/> Texto completo oficial
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── MÓDULOS ── */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:14, padding:'20px 24px', marginBottom:16,
      }}>
        <div style={{
          fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
          color:'var(--text-3)', textTransform:'uppercase', letterSpacing:.8, marginBottom:14,
        }}>Funcionalidades do sistema</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10}}>
          {MODULOS.map(m => (
            <div key={m.label} style={{
              display:'flex', gap:10, padding:'10px 12px',
              background:'var(--bg-hover)', borderRadius:9,
              border:'1px solid var(--border)',
            }}>
              <div style={{
                width:32, height:32, borderRadius:8,
                background:'var(--accent-dim)', display:'flex',
                alignItems:'center', justifyContent:'center', flexShrink:0,
              }}>
                <m.icon/>
              </div>
              <div>
                <div style={{fontSize:13, fontWeight:500, color:'var(--text-1)'}}>{m.label}</div>
                <div style={{fontSize:11, color:'var(--text-3)', marginTop:2}}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HISTÓRICO DE VERSÕES ── */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:14, padding:'20px 24px', marginBottom:16,
      }}>
        <div
          onClick={() => setShowHistorico(v => !v)}
          style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            cursor:'pointer', userSelect:'none',
          }}
        >
          <div style={{fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:'var(--text-1)'}}>
            Histórico de Versões
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span className="badge bg-gray" style={{fontSize:11}}>4 versões</span>
            {showHistorico ? <ChevronUp size={16} style={{color:'var(--text-3)'}}/> : <ChevronDown size={16} style={{color:'var(--text-3)'}}/> }
          </div>
        </div>

        {showHistorico && (
          <div style={{marginTop:16}}>
            {HISTORICO.map((h, i) => (
              <div key={h.versao} style={{
                display:'flex', gap:16,
                paddingBottom: i < HISTORICO.length-1 ? 20 : 0,
                marginBottom:  i < HISTORICO.length-1 ? 20 : 0,
                borderBottom:  i < HISTORICO.length-1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0}}>
                  <div style={{
                    width:38, height:38, borderRadius:10,
                    background: i===0 ? 'var(--accent-dim)' : 'var(--bg-hover)',
                    border:`1.5px solid ${i===0?'var(--accent)':'var(--border)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700,
                    color: i===0 ? 'var(--accent)' : 'var(--text-3)',
                  }}>v{h.versao.split('.')[0]}</div>
                  {i < HISTORICO.length-1 && (
                    <div style={{width:1, flex:1, background:'var(--border)', marginTop:8, minHeight:16}}/>
                  )}
                </div>
                <div style={{flex:1, paddingTop:4}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
                    <span style={{fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:'var(--text-1)'}}>
                      v{h.versao}
                    </span>
                    <span className="badge bg-gray" style={{fontSize:10}}>{h.data}</span>
                    {i===0 && <span className="badge bg-green" style={{fontSize:10}}>Atual</span>}
                  </div>
                  <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                    {h.destaques.map(d => (
                      <span key={d} style={{
                        fontSize:11.5, color:'var(--text-2)',
                        background:'var(--bg-hover)', padding:'3px 9px',
                        borderRadius:6, border:'1px solid var(--border)',
                      }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DEPENDÊNCIAS ── */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:14, padding:'20px 24px', marginBottom:16,
      }}>
        <div
          onClick={() => setShowDeps(v => !v)}
          style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            cursor:'pointer', userSelect:'none',
          }}
        >
          <div style={{fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:'var(--text-1)'}}>
            Tecnologias e Dependências
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span className="badge bg-green" style={{fontSize:11}}>Todas MIT/ISC</span>
            {showDeps ? <ChevronUp size={16} style={{color:'var(--text-3)'}}/> : <ChevronDown size={16} style={{color:'var(--text-3)'}}/> }
          </div>
        </div>

        {showDeps && (
          <div style={{marginTop:14}}>
            <div className="tbl-wrap" style={{borderRadius:9, border:'1px solid var(--border)'}}>
              <table>
                <thead>
                  <tr><th>Biblioteca</th><th>Licença</th><th>Uso no sistema</th></tr>
                </thead>
                <tbody>
                  {DEPS.map(d => (
                    <tr key={d.nome}>
                      <td style={{fontWeight:500, color:'var(--text-1)'}}>{d.nome}</td>
                      <td><span className="badge bg-green" style={{fontSize:10}}>{d.licenca}</span></td>
                      <td style={{color:'var(--text-3)', fontSize:13}}>{d.uso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{fontSize:12, color:'var(--text-3)', marginTop:10}}>
              MIT e ISC são licenças permissivas totalmente compatíveis com GPL-3.0.
            </div>
          </div>
        )}
      </div>

      {/* ── RODAPÉ ── */}
      <div style={{
        textAlign:'center', padding:'20px 0 8px',
        fontSize:12.5, color:'var(--text-3)',
        borderTop:'1px solid var(--border)',
      }}>
        <div style={{marginBottom:6}}>
          Feito com <Heart size={12} style={{color:'var(--red)', display:'inline', verticalAlign:'middle', margin:'0 2px'}}/> por{' '}
          <strong style={{color:'var(--text-1)'}}>{AUTOR.nome}</strong>
        </div>
        <div>
          Escola Manager v{VERSAO} · GPL-3.0-or-later · © {ANO} {AUTOR.nome}
        </div>
        <div style={{marginTop:6, opacity:.6}}>
          "Free as in freedom" — livre para sempre usar, modificar e distribuir.
        </div>
      </div>

    </div>
  )
}
