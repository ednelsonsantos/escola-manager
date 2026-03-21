/**
 * i18n.js — Sistema de internacionalização do Escola Manager
 *
 * Uso:
 *   import { useT, IDIOMAS } from '../i18n.js'   // em pages/
 *   import { useT, IDIOMAS } from './i18n.js'    // em src/
 *   const { t, idioma } = useT()
 *   <button>{t('btn.save')}</button>
 *
 * O idioma é lido diretamente do localStorage (em_settings).
 * Fallback automático para pt-BR se a chave não existir no idioma ativo.
 */


// ── Idiomas disponíveis ───────────────────────────────────────────────────────
export const IDIOMAS = [
  { value: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷' },
  { value: 'en',    label: 'English',        flag: '🇺🇸' },
  { value: 'es',    label: 'Español',        flag: '🇪🇸' },
]

// ── Dicionário ────────────────────────────────────────────────────────────────
export const STRINGS = {

  // ══════════════════════════════════════════════════════════════════════════
  // NAVEGAÇÃO
  // ══════════════════════════════════════════════════════════════════════════
  'nav.principal':      { 'pt-BR': 'Principal',        en: 'Main',             es: 'Principal'       },
  'nav.administracao':  { 'pt-BR': 'Administração',    en: 'Administration',   es: 'Administración'  },
  'nav.dashboard':      { 'pt-BR': 'Dashboard',        en: 'Dashboard',        es: 'Panel'           },
  'nav.alunos':         { 'pt-BR': 'Alunos',           en: 'Students',         es: 'Alumnos'         },
  'nav.financeiro':     { 'pt-BR': 'Financeiro',       en: 'Financial',        es: 'Financiero'      },
  'nav.cursos':         { 'pt-BR': 'Cursos',           en: 'Courses',          es: 'Cursos'          },
  'nav.relatorios':     { 'pt-BR': 'Relatórios',       en: 'Reports',          es: 'Informes'        },
  'nav.agenda':         { 'pt-BR': 'Agenda',           en: 'Calendar',         es: 'Agenda'          },
  'nav.usuarios':       { 'pt-BR': 'Usuários',         en: 'Users',            es: 'Usuarios'        },
  'nav.auditlog':       { 'pt-BR': 'Log de Auditoria', en: 'Audit Log',        es: 'Auditoría'       },
  'nav.configuracoes':  { 'pt-BR': 'Configurações',    en: 'Settings',         es: 'Configuración'   },
  'nav.sobre':          { 'pt-BR': 'Sobre',            en: 'About',            es: 'Acerca de'       },

  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINAS — títulos e subtítulos do topbar
  // ══════════════════════════════════════════════════════════════════════════
  'page.dashboard.title':        { 'pt-BR': 'Dashboard',           en: 'Dashboard',              es: 'Panel'                  },
  'page.dashboard.sub':          { 'pt-BR': 'Visão geral',         en: 'Overview',               es: 'Vista general'          },
  'page.alunos.title':           { 'pt-BR': 'Alunos',              en: 'Students',               es: 'Alumnos'                },
  'page.alunos.sub':             { 'pt-BR': 'Gestão de matrículas',en: 'Enrollment management',  es: 'Gestión de matrículas'  },
  'page.financeiro.title':       { 'pt-BR': 'Financeiro',          en: 'Financial',              es: 'Financiero'             },
  'page.financeiro.sub':         { 'pt-BR': 'Pagamentos e receitas',en:'Payments & revenue',      es: 'Pagos e ingresos'       },
  'page.cursos.title':           { 'pt-BR': 'Cursos',              en: 'Courses',                es: 'Cursos'                 },
  'page.cursos.sub':             { 'pt-BR': 'Turmas e professores',en: 'Classes & teachers',     es: 'Clases y profesores'    },
  'page.relatorios.title':       { 'pt-BR': 'Relatórios',          en: 'Reports',                es: 'Informes'               },
  'page.relatorios.sub':         { 'pt-BR': 'Análise de dados',    en: 'Data analysis',          es: 'Análisis de datos'      },
  'page.agenda.title':           { 'pt-BR': 'Agenda',              en: 'Calendar',               es: 'Agenda'                 },
  'page.agenda.sub':             { 'pt-BR': 'Eventos e calendário',en: 'Events & calendar',      es: 'Eventos y calendario'   },
  'page.configuracoes.title':    { 'pt-BR': 'Configurações',       en: 'Settings',               es: 'Configuración'          },
  'page.configuracoes.sub':      { 'pt-BR': 'Preferências do sistema', en: 'System preferences', es: 'Preferencias del sistema'},
  'page.usuarios.title':         { 'pt-BR': 'Usuários',            en: 'Users',                  es: 'Usuarios'               },
  'page.usuarios.sub':           { 'pt-BR': 'Contas e permissões', en: 'Accounts & permissions', es: 'Cuentas y permisos'     },
  'page.sobre.title':            { 'pt-BR': 'Sobre',               en: 'About',                  es: 'Acerca de'              },
  'page.sobre.sub':              { 'pt-BR': 'Informações do sistema e licença', en: 'System info & license', es: 'Info del sistema y licencia' },
  'page.auditlog.title':         { 'pt-BR': 'Log de Auditoria',    en: 'Audit Log',              es: 'Registro de auditoría'  },
  'page.auditlog.sub':           { 'pt-BR': 'Histórico de ações',  en: 'System action history',  es: 'Historial de acciones'  },
  'page.frequencia.title':       { 'pt-BR': 'Frequência',          en: 'Attendance',             es: 'Asistencia'             },
  'page.frequencia.sub':         { 'pt-BR': 'Chamada e controle de presença', en: 'Roll call & attendance', es: 'Control de asistencia' },
  'page.novo_aluno.title':       { 'pt-BR': 'Novo Aluno',          en: 'New Student',            es: 'Nuevo Alumno'           },
  'page.novo_aluno.sub':         { 'pt-BR': 'Cadastrar novo aluno',en: 'Register new student',   es: 'Registrar nuevo alumno' },
  'page.editar_aluno.title':     { 'pt-BR': 'Editar Aluno',        en: 'Edit Student',           es: 'Editar Alumno'          },
  'page.editar_aluno.sub':       { 'pt-BR': 'Alterar dados do aluno', en: 'Update student info', es: 'Actualizar datos del alumno' },
  'page.nova_turma.title':       { 'pt-BR': 'Nova Turma',          en: 'New Class',              es: 'Nueva Clase'            },
  'page.nova_turma.sub':         { 'pt-BR': 'Criar nova turma',    en: 'Create new class',       es: 'Crear nueva clase'      },
  'page.editar_turma.title':     { 'pt-BR': 'Editar Turma',        en: 'Edit Class',             es: 'Editar Clase'           },
  'page.editar_turma.sub':       { 'pt-BR': 'Alterar dados da turma', en: 'Update class info',   es: 'Actualizar datos de la clase' },
  'page.novo_prof.title':        { 'pt-BR': 'Novo Professor',      en: 'New Teacher',            es: 'Nuevo Profesor'         },
  'page.novo_prof.sub':          { 'pt-BR': 'Cadastrar professor', en: 'Register teacher',       es: 'Registrar profesor'     },
  'page.editar_prof.title':      { 'pt-BR': 'Editar Professor',    en: 'Edit Teacher',           es: 'Editar Profesor'        },
  'page.editar_prof.sub':        { 'pt-BR': 'Alterar dados do professor', en: 'Update teacher info', es: 'Actualizar datos del profesor' },
  'page.novo_evento.title':      { 'pt-BR': 'Novo Evento',         en: 'New Event',              es: 'Nuevo Evento'           },
  'page.novo_evento.sub':        { 'pt-BR': 'Adicionar evento ao calendário', en: 'Add event to calendar', es: 'Agregar evento al calendario' },
  'page.editar_evento.title':    { 'pt-BR': 'Editar Evento',       en: 'Edit Event',             es: 'Editar Evento'          },
  'page.editar_evento.sub':      { 'pt-BR': 'Alterar evento',      en: 'Update event',           es: 'Actualizar evento'      },
  'page.novo_usuario.title':     { 'pt-BR': 'Novo Usuário',        en: 'New User',               es: 'Nuevo Usuario'          },
  'page.novo_usuario.sub':       { 'pt-BR': 'Cadastrar nova conta',en: 'Register new account',   es: 'Registrar nueva cuenta' },
  'page.editar_usuario.title':   { 'pt-BR': 'Editar Usuário',      en: 'Edit User',              es: 'Editar Usuario'         },
  'page.editar_usuario.sub':     { 'pt-BR': 'Alterar dados e perfil', en: 'Update user data & profile', es: 'Actualizar datos y perfil' },
  'page.novo_perfil.title':      { 'pt-BR': 'Novo Perfil',         en: 'New Profile',            es: 'Nuevo Perfil'           },
  'page.novo_perfil.sub':        { 'pt-BR': 'Criar perfil de acesso', en: 'Create access profile', es: 'Crear perfil de acceso' },
  'page.editar_perfil.title':    { 'pt-BR': 'Editar Perfil',       en: 'Edit Profile',           es: 'Editar Perfil'          },
  'page.editar_perfil.sub':      { 'pt-BR': 'Alterar permissões',  en: 'Update permissions',     es: 'Actualizar permisos'    },

  // ══════════════════════════════════════════════════════════════════════════
  // APP SHELL — search, acesso, janela
  // ══════════════════════════════════════════════════════════════════════════
  'app.search_placeholder':{ 'pt-BR': 'Buscar alunos, eventos, páginas...', en: 'Search students, events, pages...', es: 'Buscar alumnos, eventos, páginas...' },
  'app.search_no_results': { 'pt-BR': 'Nenhum resultado para', en: 'No results for',        es: 'Sin resultados para'    },
  'app.search_empty':      { 'pt-BR': 'Digite para buscar...', en: 'Type to search...',     es: 'Escribe para buscar...' },
  'app.search_goto':       { 'pt-BR': 'Ir para página',        en: 'Go to page',            es: 'Ir a la página'         },
  'app.no_access':         { 'pt-BR': 'Acesso não permitido',  en: 'Access not allowed',    es: 'Acceso no permitido'    },
  'app.no_access_sub':     { 'pt-BR': 'Você não tem permissão para visualizar este módulo.', en: 'You do not have permission to view this module.', es: 'No tienes permiso para ver este módulo.' },
  'app.minimize':          { 'pt-BR': 'Minimizar',             en: 'Minimize',              es: 'Minimizar'              },
  'app.maximize':          { 'pt-BR': 'Maximizar',             en: 'Maximize',              es: 'Maximizar'              },
  'app.restore':           { 'pt-BR': 'Restaurar',             en: 'Restore',               es: 'Restaurar'              },
  'app.close':             { 'pt-BR': 'Fechar',                en: 'Close',                 es: 'Cerrar'                 },
  'app.logout':            { 'pt-BR': 'Sair',                  en: 'Log out',               es: 'Cerrar sesión'          },
  'app.toggle_theme':      { 'pt-BR': 'Alternar tema',         en: 'Toggle theme',          es: 'Cambiar tema'           },

  // ══════════════════════════════════════════════════════════════════════════
  // NOTIFICAÇÕES
  // ══════════════════════════════════════════════════════════════════════════
  'notif.title':           { 'pt-BR': 'Notificações',          en: 'Notifications',         es: 'Notificaciones'         },
  'notif.late_singular':   { 'pt-BR': 'pagamento em atraso',   en: 'overdue payment',       es: 'pago vencido'           },
  'notif.late_plural':     { 'pt-BR': 'pagamentos em atraso',  en: 'overdue payments',      es: 'pagos vencidos'         },
  'notif.open_amount':     { 'pt-BR': 'em aberto',             en: 'outstanding',           es: 'pendiente'              },
  'notif.pending_singular':{ 'pt-BR': 'pagamento pendente',    en: 'pending payment',       es: 'pago pendiente'         },
  'notif.pending_plural':  { 'pt-BR': 'pagamentos pendentes',  en: 'pending payments',      es: 'pagos pendientes'       },
  'notif.awaiting':        { 'pt-BR': 'Aguardando confirmação',en: 'Awaiting confirmation', es: 'Esperando confirmación' },
  'notif.today_event':     { 'pt-BR': 'Hoje:',                 en: 'Today:',                es: 'Hoy:'                   },
  'notif.all_day':         { 'pt-BR': 'Dia todo',              en: 'All day',               es: 'Todo el día'            },
  'notif.all_good':        { 'pt-BR': 'Tudo em dia!',          en: 'All caught up!',        es: '¡Todo al día!'          },

  // ══════════════════════════════════════════════════════════════════════════
  // BOTÕES GENÉRICOS
  // ══════════════════════════════════════════════════════════════════════════
  'btn.save':              { 'pt-BR': 'Salvar',                 en: 'Save',                  es: 'Guardar'                },
  'btn.cancel':            { 'pt-BR': 'Cancelar',               en: 'Cancel',                es: 'Cancelar'               },
  'btn.close':             { 'pt-BR': 'Fechar',                 en: 'Close',                 es: 'Cerrar'                 },
  'btn.confirm':           { 'pt-BR': 'Confirmar',              en: 'Confirm',               es: 'Confirmar'              },
  'btn.delete':            { 'pt-BR': 'Excluir',                en: 'Delete',                es: 'Eliminar'               },
  'btn.edit':              { 'pt-BR': 'Editar',                 en: 'Edit',                  es: 'Editar'                 },
  'btn.add':               { 'pt-BR': 'Adicionar',              en: 'Add',                   es: 'Agregar'                },
  'btn.export':            { 'pt-BR': 'Exportar',               en: 'Export',                es: 'Exportar'               },
  'btn.back':              { 'pt-BR': 'Voltar',                 en: 'Back',                  es: 'Volver'                 },
  'btn.new':               { 'pt-BR': 'Novo',                   en: 'New',                   es: 'Nuevo'                  },
  'btn.generate':          { 'pt-BR': 'Gerar',                  en: 'Generate',              es: 'Generar'                },
  'btn.register':          { 'pt-BR': 'Cadastrar',              en: 'Register',              es: 'Registrar'              },
  'btn.search':            { 'pt-BR': 'Buscar',                 en: 'Search',                es: 'Buscar'                 },

  // ══════════════════════════════════════════════════════════════════════════
  // STATUS — pagamentos
  // ══════════════════════════════════════════════════════════════════════════
  'status.paid':           { 'pt-BR': 'Pago',                   en: 'Paid',                  es: 'Pagado'                 },
  'status.pending':        { 'pt-BR': 'Pendente',               en: 'Pending',               es: 'Pendiente'              },
  'status.overdue':        { 'pt-BR': 'Atrasado',               en: 'Overdue',               es: 'Vencido'                },
  'status.all':            { 'pt-BR': 'Todos',                  en: 'All',                   es: 'Todos'                  },

  // ══════════════════════════════════════════════════════════════════════════
  // FINANCEIRO
  // ══════════════════════════════════════════════════════════════════════════
  'fin.received':          { 'pt-BR': 'Recebido',               en: 'Received',              es: 'Recibido'               },
  'fin.overdue':           { 'pt-BR': 'Em Atraso',              en: 'Overdue',               es: 'Vencido'                },
  'fin.pending':           { 'pt-BR': 'Pendente',               en: 'Pending',               es: 'Pendiente'              },
  'fin.total_potential':   { 'pt-BR': 'Potencial Total',        en: 'Total Potential',       es: 'Potencial Total'        },
  'fin.monthly_revenue':   { 'pt-BR': 'Faturamento Mensal',     en: 'Monthly Revenue',       es: 'Facturación Mensual'    },
  'fin.last_7months':      { 'pt-BR': 'Últimos 7 meses · Receitas confirmadas', en: 'Last 7 months · Confirmed revenue', es: 'Últimos 7 meses · Ingresos confirmados' },
  'fin.students_by_lang':  { 'pt-BR': 'Alunos por Idioma',      en: 'Students by Language',  es: 'Alumnos por Idioma'     },
  'fin.active_enrollments':{ 'pt-BR': 'matrículas ativas',      en: 'active enrollments',    es: 'matrículas activas'     },
  'fin.recent_activity':   { 'pt-BR': 'Movimentações Recentes', en: 'Recent Activity',       es: 'Movimientos Recientes'  },
  'fin.defaulters':        { 'pt-BR': 'Inadimplentes',          en: 'Defaulters',            es: 'Morosos'                },
  'fin.in_arrears':        { 'pt-BR': 'em atraso',              en: 'in arrears',            es: 'en mora'                },
  'fin.no_defaulters':     { 'pt-BR': 'Nenhum inadimplente!',   en: 'No defaulters!',        es: '¡Sin morosos!'          },
  'fin.all_on_time':       { 'pt-BR': 'Todos os pagamentos em dia', en: 'All payments on time', es: 'Todos los pagos al día' },
  'fin.no_activity':       { 'pt-BR': 'Nenhuma movimentação',   en: 'No activity',           es: 'Sin movimientos'        },
  'fin.charges':           { 'pt-BR': 'Cobranças',              en: 'Charges',               es: 'Cargos'                 },
  'fin.month_ref':         { 'pt-BR': 'Mês de referência',      en: 'Reference month',       es: 'Mes de referencia'      },
  'fin.due_date':          { 'pt-BR': 'Vencimento',             en: 'Due date',              es: 'Vencimiento'            },
  'fin.payment_date':      { 'pt-BR': 'Pagamento',              en: 'Payment date',          es: 'Fecha de pago'          },
  'fin.student':           { 'pt-BR': 'Aluno',                  en: 'Student',               es: 'Alumno'                 },
  'fin.class':             { 'pt-BR': 'Turma',                  en: 'Class',                 es: 'Clase'                  },
  'fin.value':             { 'pt-BR': 'Valor',                  en: 'Value',                 es: 'Valor'                  },
  'fin.actions':           { 'pt-BR': 'Ações',                  en: 'Actions',               es: 'Acciones'               },
  'fin.status':            { 'pt-BR': 'Status',                 en: 'Status',                es: 'Estado'                 },
  'fin.receive':           { 'pt-BR': 'Receber',                en: 'Receive',               es: 'Cobrar'                 },
  'fin.mark_overdue':      { 'pt-BR': 'Marcar Vencidos como Atrasados', en: 'Mark Overdue as Late', es: 'Marcar Vencidos como Atrasados' },
  'fin.generate_monthly':  { 'pt-BR': 'Gerar Mensalidades',     en: 'Generate Monthly Fees', es: 'Generar Mensualidades'  },
  'fin.add_payment':       { 'pt-BR': 'Lançar Pagamento Avulso',en: 'Add Single Payment',    es: 'Agregar Pago Avulso'    },
  'fin.pdf_report':        { 'pt-BR': 'Relatório PDF',          en: 'PDF Report',            es: 'Informe PDF'            },
  'fin.export_csv':        { 'pt-BR': 'Exportar CSV',           en: 'Export CSV',            es: 'Exportar CSV'           },
  'fin.no_results':        { 'pt-BR': 'Nenhum resultado para este filtro.', en: 'No results for this filter.', es: 'Sin resultados para este filtro.' },
  'fin.receipt':           { 'pt-BR': 'Emitir recibo',          en: 'Emit receipt',          es: 'Emitir recibo'          },
  'fin.confirm_receipt':   { 'pt-BR': 'Confirmar Recebimento',  en: 'Confirm Receipt',       es: 'Confirmar Recibo'       },
  'fin.confirm_payment_of':{ 'pt-BR': 'Confirmar pagamento de', en: 'Confirm payment of',    es: 'Confirmar pago de'      },
  'fin.receipt_date':      { 'pt-BR': 'Data do recebimento',    en: 'Receipt date',          es: 'Fecha de recibo'        },
  'fin.receipt_hint':      { 'pt-BR': 'Padrão: hoje. Altere se o pagamento ocorreu em outra data.', en: 'Default: today. Change if payment occurred on another date.', es: 'Por defecto: hoy. Cambia si el pago ocurrió en otra fecha.' },
  'fin.edit_payment':      { 'pt-BR': 'Editar Pagamento',       en: 'Edit Payment',          es: 'Editar Pago'            },
  'fin.payment_status':    { 'pt-BR': 'Status do Pagamento',    en: 'Payment Status',        es: 'Estado del Pago'        },
  'fin.status_warning':    { 'pt-BR': 'Atenção: alterar de "Pago" para outro status não desfaz a baixa contábil.', en: 'Warning: changing from "Paid" does not reverse the accounting entry.', es: 'Atención: cambiar de "Pagado" no revierte el registro contable.' },
  'fin.internal_obs':      { 'pt-BR': 'Observação interna',     en: 'Internal note',         es: 'Nota interna'           },
  'fin.obs_placeholder':   { 'pt-BR': 'Ex: cheque devolvido, desconto negociado...', en: 'E.g.: returned check, negotiated discount...', es: 'Ej.: cheque devuelto, descuento negociado...' },
  'fin.actions_month':     { 'pt-BR': 'Ações do Mês',           en: 'Month Actions',         es: 'Acciones del Mes'       },
  'fin.summary':           { 'pt-BR': 'Resumo',                 en: 'Summary',               es: 'Resumen'                },
  'fin.due_day':           { 'pt-BR': 'Vencimento:',            en: 'Due:',                  es: 'Vencimiento:'           },
  'fin.received_count':    { 'pt-BR': 'Recebidos:',             en: 'Received:',             es: 'Recibidos:'             },
  'fin.rate':              { 'pt-BR': 'Taxa:',                  en: 'Rate:',                 es: 'Tasa:'                  },
  'fin.delete_payment':    { 'pt-BR': 'Excluir lançamento',     en: 'Delete entry',          es: 'Eliminar registro'      },
  'fin.add_single_title':  { 'pt-BR': 'Lançar Pagamento Avulso',en: 'Add Single Payment',    es: 'Agregar Pago Avulso'    },
  'fin.add_single_hint':   { 'pt-BR': 'Use para lançar cobranças extras: matrícula, material, reposição de aula, etc.', en: 'Use for extra charges: enrollment, materials, makeup classes, etc.', es: 'Use para cargos adicionales: matrícula, materiales, clases de recuperación, etc.' },
  'fin.initial_status':    { 'pt-BR': 'Status inicial',         en: 'Initial status',        es: 'Estado inicial'         },
  'fin.already_received':  { 'pt-BR': 'Pago (já recebido)',     en: 'Paid (already received)',es: 'Pagado (ya recibido)'   },
  'fin.awaiting_payment':  { 'pt-BR': 'Pendente (aguardando)',  en: 'Pending (awaiting)',    es: 'Pendiente (esperando)'  },
  'fin.generate_for':      { 'pt-BR': 'Serão geradas mensalidades para todos os alunos ativos em', en: 'Monthly fees will be generated for all active students in', es: 'Se generarán mensualidades para todos los alumnos activos en' },
  'fin.active_students':   { 'pt-BR': 'Alunos ativos:',         en: 'Active students:',      es: 'Alumnos activos:'       },
  'fin.due_day_label':     { 'pt-BR': 'Dia de vencimento:',     en: 'Due day:',              es: 'Día de vencimiento:'    },
  'fin.no_duplicates':     { 'pt-BR': 'Mensalidades já existentes serão ignoradas (sem duplicatas).', en: 'Existing fees will be ignored (no duplicates).', es: 'Las mensualidades existentes serán ignoradas (sin duplicados).' },

  // ══════════════════════════════════════════════════════════════════════════
  // ALUNOS — formulário
  // ══════════════════════════════════════════════════════════════════════════
  'aluno.title_new':       { 'pt-BR': 'Novo Aluno',             en: 'New Student',           es: 'Nuevo Alumno'           },
  'aluno.title_edit':      { 'pt-BR': 'Editar Aluno',           en: 'Edit Student',          es: 'Editar Alumno'          },
  'aluno.subtitle_new':    { 'pt-BR': 'Preencha os dados para cadastrar um novo aluno', en: 'Fill in the details to register a new student', es: 'Complete los datos para registrar un nuevo alumno' },
  'aluno.personal_data':   { 'pt-BR': 'Dados Pessoais',         en: 'Personal Data',         es: 'Datos Personales'       },
  'aluno.academic_data':   { 'pt-BR': 'Dados Acadêmicos',       en: 'Academic Data',         es: 'Datos Académicos'       },
  'aluno.observations':    { 'pt-BR': 'Observações',            en: 'Notes',                 es: 'Observaciones'          },
  'aluno.full_name':       { 'pt-BR': 'Nome Completo',          en: 'Full Name',             es: 'Nombre Completo'        },
  'aluno.name_placeholder':{ 'pt-BR': 'Nome completo do aluno', en: "Student's full name",   es: 'Nombre completo del alumno' },
  'aluno.email':           { 'pt-BR': 'E-mail',                 en: 'Email',                 es: 'Correo electrónico'     },
  'aluno.phone':           { 'pt-BR': 'Telefone',               en: 'Phone',                 es: 'Teléfono'               },
  'aluno.birthdate':       { 'pt-BR': 'Data de Nascimento',     en: 'Date of Birth',         es: 'Fecha de Nacimiento'    },
  'aluno.enrollment_date': { 'pt-BR': 'Data de Matrícula',      en: 'Enrollment Date',       es: 'Fecha de Matrícula'     },
  'aluno.class':           { 'pt-BR': 'Turma',                  en: 'Class',                 es: 'Clase'                  },
  'aluno.select_class':    { 'pt-BR': 'Selecionar turma',       en: 'Select class',          es: 'Seleccionar clase'      },
  'aluno.status':          { 'pt-BR': 'Status',                 en: 'Status',                es: 'Estado'                 },
  'aluno.monthly_fee':     { 'pt-BR': 'Mensalidade (R$)',       en: 'Monthly Fee (R$)',      es: 'Mensualidad (R$)'       },
  'aluno.due_day':         { 'pt-BR': 'Dia de Vencimento',      en: 'Due Day',               es: 'Día de Vencimiento'     },
  'aluno.due_day_hint':    { 'pt-BR': 'Próximo vencimento: dia',en: 'Next due: day',         es: 'Próximo vencimiento: día' },
  'aluno.due_day_suffix':  { 'pt-BR': 'de cada mês',            en: 'of each month',         es: 'de cada mes'            },
  'aluno.obs_placeholder': { 'pt-BR': 'Informações adicionais sobre o aluno...', en: 'Additional information about the student...', es: 'Información adicional sobre el alumno...' },
  'aluno.last_payments':   { 'pt-BR': 'Últimos pagamentos',     en: 'Recent payments',       es: 'Últimos pagos'          },
  'aluno.no_class':        { 'pt-BR': 'Sem turma selecionada',  en: 'No class selected',     es: 'Sin clase seleccionada' },
  'aluno.enrolling':       { 'pt-BR': 'Cadastrar aluno',        en: 'Register student',      es: 'Registrar alumno'       },
  'aluno.saving':          { 'pt-BR': 'Salvar alterações',      en: 'Save changes',          es: 'Guardar cambios'        },
  'aluno.cancel_back':     { 'pt-BR': 'Cancelar e voltar',      en: 'Cancel and go back',    es: 'Cancelar y volver'      },
  'aluno.fix_fields':      { 'pt-BR': 'Corrija os campos destacados antes de salvar.', en: 'Fix the highlighted fields before saving.', es: 'Corrija los campos resaltados antes de guardar.' },
  'aluno.status_active':   { 'pt-BR': 'Ativo',                  en: 'Active',                es: 'Activo'                 },
  'aluno.status_inactive': { 'pt-BR': 'Inativo',                en: 'Inactive',              es: 'Inactivo'               },
  'aluno.status_locked':   { 'pt-BR': 'Trancado',               en: 'On hold',               es: 'Bloqueado'              },
  'aluno.preview_title':   { 'pt-BR': 'Mensalidade',            en: 'Monthly Fee',           es: 'Mensualidad'            },
  'aluno.preview_due':     { 'pt-BR': 'Vencimento',             en: 'Due',                   es: 'Vencimiento'            },
  'aluno.preview_class':   { 'pt-BR': 'Turma',                  en: 'Class',                 es: 'Clase'                  },
  'aluno.preview_schedule':{ 'pt-BR': 'Horário',                en: 'Schedule',              es: 'Horario'                },
  'aluno.preview_teacher': { 'pt-BR': 'Professor',              en: 'Teacher',               es: 'Profesor'               },
  'aluno.preview_enroll':  { 'pt-BR': 'Matrícula',              en: 'Enrollment',            es: 'Matrícula'              },

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD — abas e widgets
  // ══════════════════════════════════════════════════════════════════════════
  'dash.tab_overview':     { 'pt-BR': 'Visão Geral',            en: 'Overview',              es: 'Vista General'          },
  'dash.tab_financial':    { 'pt-BR': 'Financeiro',             en: 'Financial',             es: 'Financiero'             },
  'dash.tab_pedagogical':  { 'pt-BR': 'Pedagógico',             en: 'Pedagogical',           es: 'Pedagógico'             },
  'dash.tab_agenda':       { 'pt-BR': 'Agenda',                 en: 'Calendar',              es: 'Agenda'                 },
  'dash.active_students':  { 'pt-BR': 'Alunos Ativos',          en: 'Active Students',       es: 'Alumnos Activos'        },
  'dash.active_classes':   { 'pt-BR': 'Turmas Ativas',          en: 'Active Classes',        es: 'Clases Activas'         },
  'dash.defaulters':       { 'pt-BR': 'Inadimplentes',          en: 'Defaulters',            es: 'Morosos'                },
  'dash.at_risk':          { 'pt-BR': 'em risco',               en: 'at risk',               es: 'en riesgo'              },
  'dash.teachers':         { 'pt-BR': 'professores',            en: 'teachers',              es: 'profesores'             },
  'dash.new_student':      { 'pt-BR': 'Novo Aluno',             en: 'New Student',           es: 'Nuevo Alumno'           },
  'dash.reports':          { 'pt-BR': 'Ver Relatórios',         en: 'View Reports',          es: 'Ver Informes'           },
  'dash.defaulter_count':  { 'pt-BR': 'Inadimplente',           en: 'Defaulter',             es: 'Moroso'                 },
  'dash.defaulter_count_p':{ 'pt-BR': 'Inadimplentes',          en: 'Defaulters',            es: 'Morosos'                },

  // ══════════════════════════════════════════════════════════════════════════
  // CONFIGURAÇÕES
  // ══════════════════════════════════════════════════════════════════════════
  'cfg.identity':          { 'pt-BR': 'Identidade Visual',      en: 'Visual Identity',       es: 'Identidad Visual'       },
  'cfg.school':            { 'pt-BR': 'Escola',                 en: 'School',                es: 'Escuela'                },
  'cfg.financial':         { 'pt-BR': 'Financeiro',             en: 'Financial',             es: 'Financiero'             },
  'cfg.appearance':        { 'pt-BR': 'Aparência',              en: 'Appearance',            es: 'Apariencia'             },
  'cfg.system':            { 'pt-BR': 'Sistema',                en: 'System',                es: 'Sistema'                },
  'cfg.data':              { 'pt-BR': 'Dados',                  en: 'Data',                  es: 'Datos'                  },
  'cfg.language':          { 'pt-BR': 'Idioma do Sistema',      en: 'System Language',       es: 'Idioma del Sistema'     },
  'cfg.language_hint':     { 'pt-BR': 'Altera o idioma de toda a interface do sistema.', en: 'Changes the language of the entire system interface.', es: 'Cambia el idioma de toda la interfaz del sistema.' },
  'cfg.theme':             { 'pt-BR': 'Tema',                   en: 'Theme',                 es: 'Tema'                   },
  'cfg.dark':              { 'pt-BR': 'Escuro',                 en: 'Dark',                  es: 'Oscuro'                 },
  'cfg.dark_desc':         { 'pt-BR': 'Interface com fundo escuro', en: 'Dark background interface', es: 'Interfaz con fondo oscuro' },
  'cfg.light':             { 'pt-BR': 'Claro',                  en: 'Light',                 es: 'Claro'                  },
  'cfg.light_desc':        { 'pt-BR': 'Interface com fundo claro', en: 'Light background interface', es: 'Interfaz con fondo claro' },
  'cfg.accent_color':      { 'pt-BR': 'Cor de Destaque',        en: 'Accent Color',          es: 'Color de Acento'        },
  'cfg.accent_hint':       { 'pt-BR': 'A cor de destaque é usada em botões, links ativos e gráficos.', en: 'The accent color is used in buttons, active links and charts.', es: 'El color de acento se usa en botones, enlaces activos y gráficos.' },
  'cfg.font_size':         { 'pt-BR': 'Tamanho do Texto',       en: 'Text Size',             es: 'Tamaño del Texto'       },
  'cfg.compact':           { 'pt-BR': 'Compacto',               en: 'Compact',               es: 'Compacto'               },
  'cfg.compact_desc':      { 'pt-BR': '88% — mais informações na tela', en: '88% — more info on screen', es: '88% — más información en pantalla' },
  'cfg.normal':            { 'pt-BR': 'Normal',                 en: 'Normal',                es: 'Normal'                 },
  'cfg.normal_desc':       { 'pt-BR': '100% — padrão recomendado', en: '100% — recommended default', es: '100% — predeterminado recomendado' },
  'cfg.large':             { 'pt-BR': 'Grande',                 en: 'Large',                 es: 'Grande'                 },
  'cfg.large_desc':        { 'pt-BR': '110% — maior legibilidade', en: '110% — better readability', es: '110% — mayor legibilidad' },
  'cfg.notifications':     { 'pt-BR': 'Notificações de inadimplência', en: 'Delinquency notifications', es: 'Notificaciones de morosidad' },
  'cfg.notifications_desc':{ 'pt-BR': 'Exibir alerta quando houver pagamentos atrasados', en: 'Show alert when there are overdue payments', es: 'Mostrar alerta cuando haya pagos vencidos' },
  'cfg.auto_backup':       { 'pt-BR': 'Backup automático ao fechar', en: 'Auto backup on close', es: 'Copia de seguridad automática al cerrar' },
  'cfg.open_backup_folder':{ 'pt-BR': '📁 Abrir pasta de backups', en: '📁 Open backups folder', es: '📁 Abrir carpeta de copias' },
  'cfg.saved':             { 'pt-BR': 'Configurações salvas!',  en: 'Settings saved!',       es: '¡Configuración guardada!' },
  'cfg.notifications_and_automation': { 'pt-BR': 'Notificações e Automação', en: 'Notifications & Automation', es: 'Notificaciones y Automatización' },
  'cfg.system_info':       { 'pt-BR': 'Informações do Sistema', en: 'System Information',    es: 'Información del Sistema' },


  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD — widgets e abas
  // ══════════════════════════════════════════════════════════════════════════
  'dash.tab_overview':        { 'pt-BR': 'Visão Geral',              en: 'Overview',               es: 'Vista General'           },
  'dash.tab_financial':       { 'pt-BR': 'Financeiro',               en: 'Financial',              es: 'Financiero'              },
  'dash.tab_pedagogical':     { 'pt-BR': 'Pedagógico',               en: 'Pedagogical',            es: 'Pedagógico'              },
  'dash.tab_agenda':          { 'pt-BR': 'Agenda',                   en: 'Calendar',               es: 'Agenda'                  },
  'dash.active_students':     { 'pt-BR': 'Alunos Ativos',            en: 'Active Students',        es: 'Alumnos Activos'         },
  'dash.active_classes':      { 'pt-BR': 'Turmas Ativas',            en: 'Active Classes',         es: 'Clases Activas'          },
  'dash.defaulters':          { 'pt-BR': 'Inadimplentes',            en: 'Defaulters',             es: 'Morosos'                 },
  'dash.at_risk':             { 'pt-BR': 'em risco',                 en: 'at risk',                es: 'en riesgo'               },
  'dash.teachers':            { 'pt-BR': 'professores',              en: 'teachers',               es: 'profesores'              },
  'dash.new_student':         { 'pt-BR': 'Novo Aluno',               en: 'New Student',            es: 'Nuevo Alumno'            },
  'dash.financial':           { 'pt-BR': 'Financeiro',               en: 'Financial',              es: 'Financiero'              },
  'dash.reports':             { 'pt-BR': 'Ver Relatórios',           en: 'View Reports',           es: 'Ver Informes'            },
  'dash.agenda':              { 'pt-BR': 'Agenda',                   en: 'Calendar',               es: 'Agenda'                  },
  'dash.defaulter_count':     { 'pt-BR': 'Inadimplente',             en: 'Defaulter',              es: 'Moroso'                  },
  'dash.defaulter_count_p':   { 'pt-BR': 'Inadimplentes',            en: 'Defaulters',             es: 'Morosos'                 },
  'dash.forecast_month':      { 'pt-BR': 'Previsão do Mês',          en: 'Month Forecast',         es: 'Previsión del Mes'       },
  'dash.forecast_sub':        { 'pt-BR': 'Recebido + pendentes confirmados', en: 'Received + confirmed pending', es: 'Recibido + pendiente confirmado' },
  'dash.overdue_monthly':     { 'pt-BR': 'Inadimplência Mensal',     en: 'Monthly Defaults',       es: 'Morosidad Mensual'       },
  'dash.overdue_sub':         { 'pt-BR': 'Valores em atraso por mês',en: 'Overdue amounts by month',es: 'Importes vencidos por mes' },
  'dash.payments_today':      { 'pt-BR': 'Pagamentos de Hoje',       en: "Today's Payments",       es: 'Pagos de Hoy'            },
  'dash.no_payments_today':   { 'pt-BR': 'Nenhum pagamento hoje',    en: 'No payments today',      es: 'Sin pagos hoy'           },
  'dash.my_students':         { 'pt-BR': 'Meus Alunos',              en: 'My Students',            es: 'Mis Alumnos'             },
  'dash.my_classes':          { 'pt-BR': 'Minhas Turmas',            en: 'My Classes',             es: 'Mis Clases'              },
  'dash.students_at_risk':    { 'pt-BR': 'Alunos em Risco',          en: 'Students at Risk',       es: 'Alumnos en Riesgo'       },
  'dash.freq_below':          { 'pt-BR': 'Frequência abaixo de 75%', en: 'Attendance below 75%',   es: 'Asistencia inferior al 75%' },
  'dash.active_teachers':     { 'pt-BR': 'Professores Ativos',       en: 'Active Teachers',        es: 'Profesores Activos'      },
  'dash.classes_covered':     { 'pt-BR': 'turmas cobertas',          en: 'classes covered',        es: 'clases cubiertas'        },
  'dash.no_classes':          { 'pt-BR': 'Nenhuma turma',            en: 'No classes',             es: 'Sin clases'              },
  'dash.freq_data_hint':      { 'pt-BR': 'Dados de frequência disponíveis na aba Frequência', en: 'Attendance data available in the Attendance tab', es: 'Datos de asistencia disponibles en la pestaña Asistencia' },
  'dash.go_freq':             { 'pt-BR': 'Ir para Frequência →',     en: 'Go to Attendance →',     es: 'Ir a Asistencia →'       },
  'dash.class_occupation':    { 'pt-BR': 'Ocupação das Turmas',      en: 'Class Occupancy',        es: 'Ocupación de Clases'     },
  'dash.my_class_occupation': { 'pt-BR': 'Ocupação das Minhas Turmas', en: 'My Class Occupancy',   es: 'Ocupación de Mis Clases' },
  'dash.next_7days':          { 'pt-BR': 'Próximos 7 Dias',          en: 'Next 7 Days',            es: 'Próximos 7 Días'         },
  'dash.no_events':           { 'pt-BR': 'Nenhum evento nos próximos 7 dias', en: 'No events in the next 7 days', es: 'Sin eventos en los próximos 7 días' },
  'dash.see_full_agenda':     { 'pt-BR': 'Ver agenda completa →',    en: 'See full calendar →',    es: 'Ver agenda completa →'   },
  'dash.birthdays':           { 'pt-BR': 'Aniversariantes do Mês',   en: 'Birthdays This Month',   es: 'Cumpleaños del Mes'      },
  'dash.birthdays_short':     { 'pt-BR': 'Aniversariantes',          en: 'Birthdays',              es: 'Cumpleaños'              },
  'dash.no_birthdays':        { 'pt-BR': 'Nenhum aniversariante este mês', en: 'No birthdays this month', es: 'Sin cumpleaños este mes' },
  'dash.due_today':           { 'pt-BR': 'Vencimentos Hoje',         en: 'Due Today',              es: 'Vencimientos Hoy'        },
  'dash.due_today_hint':      { 'pt-BR': 'Mensalidades que vencem hoje', en: 'Fees due today',     es: 'Mensualidades que vencen hoy' },
  'dash.upcoming_events':     { 'pt-BR': 'Eventos Próximos',         en: 'Upcoming Events',        es: 'Eventos Próximos'        },
  'dash.in_7days':            { 'pt-BR': 'Nos próximos 7 dias',      en: 'In the next 7 days',     es: 'En los próximos 7 días'  },

  // ══════════════════════════════════════════════════════════════════════════
  // CONFIGURAÇÕES — chaves extras usadas no Configuracoes.jsx
  // ══════════════════════════════════════════════════════════════════════════
  'config.identity':       { 'pt-BR': 'Identidade Visual',      en: 'Visual Identity',       es: 'Identidad Visual'       },
  'config.school':         { 'pt-BR': 'Escola',                 en: 'School',                es: 'Escuela'                },
  'config.financial':      { 'pt-BR': 'Financeiro',             en: 'Financial',             es: 'Financiero'             },
  'config.appearance':     { 'pt-BR': 'Aparência',              en: 'Appearance',            es: 'Apariencia'             },
  'config.system':         { 'pt-BR': 'Sistema',                en: 'System',                es: 'Sistema'                },
  'config.data':           { 'pt-BR': 'Dados',                  en: 'Data',                  es: 'Datos'                  },
  'config.save':           { 'pt-BR': 'Salvar',                 en: 'Save',                  es: 'Guardar'                },
  'config.save_identity':  { 'pt-BR': 'Salvar Identidade',      en: 'Save Identity',         es: 'Guardar Identidad'      },
  'config.logo_upload':    { 'pt-BR': 'Selecionar logo',        en: 'Select logo',           es: 'Seleccionar logo'       },
  'config.logo_change':    { 'pt-BR': 'Trocar logo',            en: 'Change logo',           es: 'Cambiar logo'           },
  'config.theme_dark':     { 'pt-BR': 'Escuro',                 en: 'Dark',                  es: 'Oscuro'                 },
  'config.theme_dark_desc':{ 'pt-BR': 'Interface com fundo escuro', en: 'Dark background interface', es: 'Interfaz con fondo oscuro' },
  'config.theme_light':    { 'pt-BR': 'Claro',                  en: 'Light',                 es: 'Claro'                  },
  'config.theme_light_desc':{'pt-BR': 'Interface com fundo claro', en: 'Light background interface', es: 'Interfaz con fondo claro' },
  'config.font_compact':   { 'pt-BR': 'Compacto',               en: 'Compact',               es: 'Compacto'               },
  'config.font_compact_desc':{'pt-BR':'88% — mais informações na tela', en: '88% — more info on screen', es: '88% — más información en pantalla' },
  'config.font_normal':    { 'pt-BR': 'Normal',                 en: 'Normal',                es: 'Normal'                 },
  'config.font_normal_desc':{ 'pt-BR':'100% — padrão recomendado', en: '100% — recommended default', es: '100% — predeterminado recomendado' },
  'config.font_large':     { 'pt-BR': 'Grande',                 en: 'Large',                 es: 'Grande'                 },
  'config.font_large_desc':{ 'pt-BR': '110% — maior legibilidade', en: '110% — better readability', es: '110% — mayor legibilidad' },
  'config.export_students':{ 'pt-BR': 'Exportar Alunos (CSV)',  en: 'Export Students (CSV)', es: 'Exportar Alumnos (CSV)' },
  'config.export_payments':{ 'pt-BR': 'Exportar Pagamentos (CSV)', en: 'Export Payments (CSV)', es: 'Exportar Pagos (CSV)' },
  'config.export_backup':  { 'pt-BR': 'Exportar Backup Completo (JSON)', en: 'Export Full Backup (JSON)', es: 'Exportar Copia Completa (JSON)' },


  // chaves adicionais — Financeiro e EditarAluno
  'fin.search_student':    { 'pt-BR': 'Buscar aluno...',         en: 'Search student...', es: 'Buscar alumno...'       },
  'fin.select_student':    { 'pt-BR': 'Selecionar aluno',        en: 'Select student',    es: 'Seleccionar alumno'     },
  'fin.optional':          { 'pt-BR': 'opcional',                en: 'optional',          es: 'opcional'               },
  'fin.no_phone':          { 'pt-BR': 'Aluno sem telefone cadastrado', en: 'Student has no phone registered', es: 'Alumno sin teléfono registrado' },
  'fin.boleto_pdf':        { 'pt-BR': 'Gerar boleto/cobrança PDF', en: 'Generate PDF bill', es: 'Generar PDF de cobro'  },
  'fin.whatsapp':          { 'pt-BR': 'Enviar cobrança via WhatsApp', en: 'Send bill via WhatsApp', es: 'Enviar cobro por WhatsApp' },
  'fin.payments_count':    { 'pt-BR': 'pgtos',                   en: 'payments',          es: 'pagos'                  },
  'fin.awaiting_lower':    { 'pt-BR': 'aguardando',              en: 'awaiting',          es: 'esperando'              },
  'fin.discount_short':    { 'pt-BR': 'desc.',                   en: 'disc.',             es: 'desc.'                  },
  'fin.no_duplicates_prefix':{ 'pt-BR': 'Mensalidades já existentes serão ignoradas (sem duplicatas).', en: 'Existing fees will be ignored (no duplicates).', es: 'Las mensualidades existentes serán ignoradas.' },
  'aluno.due_day_hint':    { 'pt-BR': 'Próximo vencimento: dia', en: 'Next due: day',     es: 'Próximo vencimiento: día' },
  'aluno.due_day_suffix':  { 'pt-BR': 'de cada mês',             en: 'of each month',     es: 'de cada mes'            },


  // chaves de validação — EditarAluno
  'aluno.err_name_required': { 'pt-BR': 'Nome é obrigatório',              en: 'Name is required',              es: 'El nombre es obligatorio'        },
  'aluno.err_email_invalid': { 'pt-BR': 'E-mail inválido',                 en: 'Invalid email',                 es: 'Correo electrónico inválido'     },
  'aluno.err_fee_required':  { 'pt-BR': 'Informe o valor da mensalidade',  en: 'Enter the monthly fee amount',  es: 'Ingrese el valor de la mensualidad' },
  'aluno.err_due_day':       { 'pt-BR': 'Informe um dia entre 1 e 28',     en: 'Enter a day between 1 and 28', es: 'Ingrese un día entre 1 y 28'      },


}

// ── Helpers ──────────────────────────────────────────────────────────────────
/**
 * getIdioma() — lê o idioma atual direto do localStorage.
 * Evita dependência do AppContext no nível de módulo, eliminando
 * problemas de ordem de inicialização e import circular.
 */
function getIdioma() {
  try {
    const s = localStorage.getItem('em_settings')
    return JSON.parse(s)?.sistema?.idioma || 'pt-BR'
  } catch {
    return 'pt-BR'
  }
}

// ── Hook useT ─────────────────────────────────────────────────────────────────
/**
 * useT() — retorna { t, idioma }
 *
 * Lê o idioma diretamente do localStorage — sem depender do AppContext.
 * Isso evita problemas de ordem de inicialização de módulos e
 * garante que o hook funcione em qualquer ponto da árvore de componentes.
 *
 * t(key) traduz a chave para o idioma ativo.
 * Fallback automático para pt-BR se a chave não existir no idioma selecionado.
 */
export function useT() {
  const idioma = getIdioma()

  function t(key) {
    const entry = STRINGS[key]
    if (!entry) {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.warn(`[i18n] chave não encontrada: "${key}"`)
      }
      return key
    }
    return entry[idioma] ?? entry['pt-BR'] ?? key
  }

  return { t, idioma }
}
