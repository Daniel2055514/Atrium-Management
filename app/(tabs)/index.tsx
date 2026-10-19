import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { deleteUser, getAuth } from 'firebase/auth';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import * as Print from 'expo-print';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../services/firebaseConfig';

/* ============================================================
   TIPOS
   ============================================================ */
interface StaffMember {
  id: string;
  name: string;
  role: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  pin?: string;
  contact?: string;
  createdAt?: number;
}
interface TaskItem {
  id: string;
  targetRole: string;
  targetName: string;
  targetStaffId?: string;
  taskText: string;
  status: 'pending' | 'done';
  requestId?: string;
  createdAt?: number;
}
interface ReportItem {
  id: string;
  room: string;
  text: string;
  author: string;
  date: string;
}
interface Session {
  username: string;
  role: string;
  staffId?: string;
}
interface AssignmentNote { id: string; author: string; text: string; date: string }
interface Assignment {
  id: string;
  date: string;
  staffId: string;
  staffName: string;
  room: string;
  taskType: 'inOut' | 'daily' | 'out';
  guestName: string;
  workStatus: 'not_started' | 'in_progress' | 'done';
  inspected: boolean;
  linen: Record<string, number> | null;
  notes: AssignmentNote[];
}
interface RoomState { id: string; status: string; prevStatus: string | null }
interface ScheduleEntry { id: string; staffId: string; date: string; text: string }
interface SupplyRequest {
  id: string;
  floor: string;
  text: string;
  author: string;
  authorId: string;
  status: 'open' | 'assigned' | 'done';
  taskId?: string;
  createdAt: number;
}
interface DailyCount { id: string; counts: Record<string, number>; updatedBy?: string }
interface PinResetState {
  kind: 'staffForgot' | 'directionForgot' | 'staffByDirection' | 'receptionByDirection';
  staff?: StaffMember;
}
interface ConfirmState {
  title: string;
  message: string;
  okLabel: string;
  destructive?: boolean;
  onOk: () => void;
}

/* ============================================================
   TRADUCCIONES (ES · FR · EN · IT · PT · RU · UK)
   Las cadenas nuevas (términos, privacidad, cuenta, offline…) están
   más abajo en `extraTranslations` y se fusionan en `buildT`.
   ============================================================ */
const translations: Record<string, any> = {
  es: {
    login: {
      welcome: 'Bienvenido', sub: 'Inicia sesión', userLabel: 'Usuario', userPlaceholder: 'Introduce tu usuario',
      pinLabel: 'PIN', btn: 'Acceder', back: 'Atrás',
      pickName: 'Selecciona tu nombre para entrar',
      noStaff: 'La dirección aún no ha dado de alta a ningún empleado en este perfil.'
    },
    appTitle: 'Hôtel Villa Genesis',
    subtitle: 'Selecciona tu perfil operativo para iniciar',
    enter: 'Acceder al perfil →',
    footerLinks: { help: '❓ Ayuda y soporte', terms: '⚖️ Términos y condiciones' },
    modalHelp: { title: 'Ayuda y soporte', content: 'Contacta con el soporte técnico en el +33 4 93 00 00 00', close: 'Cerrar' },
    modalTerms: {
      title: 'Condiciones generales de uso',
      clauses: [
        '1. Uso exclusivo: la aplicación está reservada al personal autorizado del Hôtel Villa Genesis y de los hoteles asociados.',
        '2. Confidencialidad: los datos de clientes, habitaciones y operaciones no pueden divulgarse ni utilizarse fuera del ámbito profesional.',
        '3. Cuentas personales: cada empleado es responsable de su sesión y debe cerrarla al terminar su turno.',
        '4. Protección de datos: los datos personales se tratan únicamente para la gestión operativa, conforme al RGPD. Puedes ejercer tus derechos de acceso y rectificación ante la dirección.',
        '5. Responsabilidad y cambios: la aplicación se ofrece tal cual y puede actualizarse en cualquier momento. Un uso indebido puede conllevar la suspensión del acceso.'
      ],
      close: 'Cerrar'
    },
    roles: {
      direction: { title: 'Dirección', subtitle: 'Panorama gerencial, personal y plano' },
      reception: { title: 'Recepción', subtitle: 'Plano del hotel y estado de las habitaciones' },
      governess: { title: 'Gobernante', subtitle: 'Supervisión, inspección, tareas y planning' },
      cleaning: { title: 'Limpieza', subtitle: 'Habitaciones, lencería y estados' },
      equipier: { title: 'Equipier', subtitle: 'Suministros, lavandería y tareas' },
      maintenance: { title: 'Mantenimiento', subtitle: 'Reparaciones e informes' }
    },
    feed: {
      logout: 'Cerrar sesión', location: 'Menton, Costa Azul', syncBtn: 'Sincronizar con la central',
      tabDashboard: '📊 Panel', tabMap: '🗺️ Plano', tabPlanning: '📅 Planning', tabStaff: '👥 Equipo', tabItems: '🧺 Utensilios',
      online: 'En línea'
    },
    common: { cancel: 'Cancelar', save: 'Guardar', room: 'Hab.', role: 'Rol: ', staff: 'Personal', shift: 'Turno', for: 'Para' },
    alerts: {
      noPermission: 'Aviso: no tienes permiso para realizar esta acción.',
      roomBlocked: '⚠️ Habitación bloqueada por avería. Mantenimiento debe liberarla primero.',
      taskEmpty: 'Escribe el mensaje de la tarea.',
      taskSent: '📋 Tarea enviada a la persona seleccionada.',
      linenSaved: '✅ Información guardada.',
      reportSent: '🔧 Informe enviado a la gobernante.',
      reportEmpty: 'Escribe el informe antes de enviarlo.',
      nameRequired: 'Escribe un nombre.',
      synced: '✅ Cambios guardados con éxito.'
    },
    dashboard: {
      directionTitle: 'Panorama gerencial', directionSub: 'Métricas clave y estado general del hotel.',
      occupancy: 'Ocupación actual', checkInOut: 'Entradas / salidas hoy', maintenanceIssues: 'Incidencias de mantenimiento',
      opsStatus: '🟢 Estado de las operaciones: normal y sincronizado.',
      governessTitle: 'Panel de control de la gobernante',
      governessSub: 'Supervisión general de plantas, inspecciones y órdenes a los departamentos.',
      activeTasksTitle: '📋 Listado general de tareas activas',
      inspectionTitle: '🏨 Inspección y bloqueo por averías',
      shiftTitle: '📋 Turno y habitaciones asignadas',
      assignedRoomsTitle: 'Habitaciones asignadas para hoy:',
      myTasksTitle: '📥 Tareas que te ha asignado la gobernante',
      equipierTitle: '🧺 Suministros y lencería', equipierSub: 'Gestión de stock en plantas y lavandería general.',
      completed: 'Completada', pending: 'Pendiente', approved: '✅ Aprobada', inspect: '🔍 Inspeccionar',
      block: '🔒 Bloquear', unblock: '🔓 Desbloquear', resolveUnlock: '🔓 Resolver y desbloquear',
      prevRecord: '📋 Registro previo: ', noLinen: '📋 Sin registros de lencería.',
      blockedTag: '🔒 [BLOQUEADA]', blockedWarning: '⚠️ Habitación bloqueada temporalmente por mantenimiento.',
      dailyInfo: 'ℹ️ Limpieza diaria: no requiere inspección.', inspectionInfo: '🔍 Requiere inspección de salida/entrada.',
      guestLabel: 'Cliente: ', cleaningLabel: 'Limpieza: ', statusLabel: 'Estado: ',
      taskTypes: { inOut: 'Entrada y salida', daily: 'Limpieza diaria', out: 'Salida' },
      work: { notDone: 'Aún no hecho', inCleaning: 'En limpieza', done: 'Hecho' }
    },
    cleaning: {
      towels: 'Toallas', sheets: 'Sábanas y fundas',
      removedSub: 'Indica lo que has retirado de la habitación (solo se guarda la información):',
      formSub: 'Valores base cargados (ajusta con + y −).'
    },
    mapView: {
      title: '🗺️ Plano general del hotel', subtitle: 'Estado de las habitaciones en tiempo real.', floor: 'Planta',
      general: 'Vista general', active: 'Vista activa',
      secPriority: '1. Atención prioritaria', secStay: '2. Ocupación y estancias', secAvail: '3. Disponibilidad y check-in',
      empty: 'Sin habitaciones', changeTitle: 'Cambiar estado',
      status: {
        checkout: 'Salida / Check-out', cleaning: 'En limpieza', ready: 'Libre y limpia',
        occupied: 'Ocupada', daily: 'Limpieza diaria', blocked: 'Bloqueada / Avería'
      }
    },
    tasks: {
      newTitle: '📋 Nueva tarea', dept: 'Departamento', person: 'Persona', message: 'Mensaje de la tarea',
      placeholder: 'Ej: Fuga en el lavabo de la hab. 204…', assign: 'Asignar tarea',
      noPeople: 'Sin empleados dados de alta en este departamento.'
    },
    staff: {
      title: '👥 Equipo y contratos', addTitle: 'Agregar contrato', name: 'Nombre del empleado', namePH: 'Ej: Laura',
      role: 'Puesto', save: 'Dar de alta', listTitle: 'Empleados dados de alta', empty: 'Todavía no hay empleados.'
    },
    planning: {
      title: '📅 Planning', week: 'Sem.', hint: 'Toca una casilla para cambiar el turno.', hintView: 'Consulta tu horario.',
      am: 'Mañana', pm: 'Tarde', off: 'Descanso', leave: 'Vacaciones', hours: 'h', noStaff: 'No hay empleados en el planning.',
      months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    },
    inventory: {
      title: '🧺 Utensilios del hotel', sub: 'Esta lista es la base que usa el personal de limpieza.',
      add: 'Añadir utensilio', newPH: 'Nombre del utensilio', qty: 'Cantidad base'
    },
    items: {
      largeTowels: 'Toalla grande', mediumTowels: 'Toalla mediana', faceTowels: 'Toalla de rostro', bathMat: 'Alfombrilla de baño',
      bathrobe: 'Albornoz', blackSheet2xl: 'Sábana 2XL negra 310 cm', blackSheetL: 'Sábana L negra 280 cm', greenSheetL: 'Sábana L verde 240 cm',
      yellowDuvet: 'Funda de edredón amarilla 290 cm', redDuvet: 'Funda de edredón roja 270 cm', orangeDuvet: 'Funda de edredón naranja 180 cm',
      pillowcases: 'Funda de almohada 50 × 72 cm'
    },
    maintenance: {
      title: '🔧 Mantenimiento y reparaciones', sub: 'Registra tus arreglos por habitación e informa a la gobernante.',
      roomsList: 'Listado de habitaciones', addReport: 'Informe', reportPH: 'Ej: Bombilla cambiada, grifo reparado…',
      send: 'Enviar a la gobernante', reportsTitle: '📝 Informes de mantenimiento', reportsEmpty: 'Sin informes.',
      blockedTitle: 'Habitaciones bloqueadas', noBlocked: 'No hay habitaciones bloqueadas.', from: 'De'
    }
  },

  fr: {
    login: {
      welcome: 'Bienvenue', sub: 'Connexion', userLabel: 'Utilisateur', userPlaceholder: 'Entrez votre nom d’utilisateur',
      pinLabel: 'PIN', btn: 'Accéder', back: 'Retour',
      pickName: 'Sélectionnez votre nom pour entrer',
      noStaff: 'La direction n’a encore enregistré aucun employé pour ce profil.'
    },
    appTitle: 'Hôtel Villa Genesis',
    subtitle: 'Sélectionnez votre profil opérationnel pour commencer',
    enter: 'Accéder au profil →',
    footerLinks: { help: '❓ Aide et support', terms: '⚖️ Conditions générales' },
    modalHelp: { title: 'Aide et support', content: 'Contactez le support technique au +33 4 93 00 00 00', close: 'Fermer' },
    modalTerms: {
      title: 'Conditions générales d’utilisation',
      clauses: [
        '1. Usage exclusif : l’application est réservée au personnel autorisé de l’Hôtel Villa Genesis et des hôtels partenaires.',
        '2. Confidentialité : les données des clients, des chambres et des opérations ne peuvent être divulguées ni utilisées en dehors du cadre professionnel.',
        '3. Comptes personnels : chaque employé est responsable de sa session et doit la fermer à la fin de son service.',
        '4. Protection des données : les données personnelles sont traitées uniquement pour la gestion opérationnelle, conformément au RGPD. Vous pouvez exercer vos droits d’accès et de rectification auprès de la direction.',
        '5. Responsabilité et modifications : l’application est fournie en l’état et peut être mise à jour à tout moment. Un usage abusif peut entraîner la suspension de l’accès.'
      ],
      close: 'Fermer'
    },
    roles: {
      direction: { title: 'Direction', subtitle: 'Aperçu managérial, personnel et plan' },
      reception: { title: 'Réception', subtitle: 'Plan de l’hôtel et état des chambres' },
      governess: { title: 'Gouvernante', subtitle: 'Supervision, inspection, tâches et planning' },
      cleaning: { title: 'Agent de nettoyage', subtitle: 'Chambres, linge et statuts' },
      equipier: { title: 'Équipier', subtitle: 'Approvisionnement, blanchisserie et tâches' },
      maintenance: { title: 'Maintenance', subtitle: 'Réparations et rapports' }
    },
    feed: {
      logout: 'Déconnexion', location: 'Menton, Côte d’Azur', syncBtn: 'Synchroniser avec la centrale',
      tabDashboard: '📊 Tableau', tabMap: '🗺️ Plan', tabPlanning: '📅 Planning', tabStaff: '👥 Équipe', tabItems: '🧺 Ustensiles',
      online: 'En ligne'
    },
    common: { cancel: 'Annuler', save: 'Enregistrer', room: 'Ch.', role: 'Rôle : ', staff: 'Personnel', shift: 'Service', for: 'Pour' },
    alerts: {
      noPermission: 'Attention : vous n’avez pas l’autorisation d’effectuer cette action.',
      roomBlocked: '⚠️ Chambre bloquée pour panne. La maintenance doit d’abord la libérer.',
      taskEmpty: 'Écrivez le message de la tâche.',
      taskSent: '📋 Tâche envoyée à la personne sélectionnée.',
      linenSaved: '✅ Informations enregistrées.',
      reportSent: '🔧 Rapport envoyé à la gouvernante.',
      reportEmpty: 'Écrivez le rapport avant de l’envoyer.',
      nameRequired: 'Saisissez un nom.',
      synced: '✅ Modifications enregistrées avec succès.'
    },
    dashboard: {
      directionTitle: 'Aperçu managérial', directionSub: 'Indicateurs clés et état général de l’hôtel.',
      occupancy: 'Occupation actuelle', checkInOut: 'Arrivées / départs aujourd’hui', maintenanceIssues: 'Incidents de maintenance',
      opsStatus: '🟢 État des opérations : normal et synchronisé.',
      governessTitle: 'Tableau de bord de la gouvernante',
      governessSub: 'Supervision générale des étages, inspections et ordres aux services.',
      activeTasksTitle: '📋 Liste générale des tâches actives',
      inspectionTitle: '🏨 Inspection et blocage pour pannes',
      shiftTitle: '📋 Service et chambres assignées',
      assignedRoomsTitle: 'Chambres assignées pour aujourd’hui :',
      myTasksTitle: '📥 Tâches assignées par la gouvernante',
      equipierTitle: '🧺 Approvisionnement et linge', equipierSub: 'Gestion des stocks dans les étages et blanchisserie générale.',
      completed: 'Terminée', pending: 'En attente', approved: '✅ Approuvée', inspect: '🔍 Inspecter',
      block: '🔒 Bloquer', unblock: '🔓 Débloquer', resolveUnlock: '🔓 Résoudre et débloquer',
      prevRecord: '📋 Enregistrement précédent : ', noLinen: '📋 Aucun enregistrement de linge.',
      blockedTag: '🔒 [BLOQUÉE]', blockedWarning: '⚠️ Chambre temporairement bloquée pour maintenance.',
      dailyInfo: 'ℹ️ Recouche : pas d’inspection requise.', inspectionInfo: '🔍 Nécessite une inspection de départ/arrivée.',
      guestLabel: 'Client : ', cleaningLabel: 'Nettoyage : ', statusLabel: 'Statut : ',
      taskTypes: { inOut: 'Arrivée et départ', daily: 'Recouche', out: 'Départ' },
      work: { notDone: 'Pas encore fait', inCleaning: 'En nettoyage', done: 'Fait' }
    },
    cleaning: {
      towels: 'Serviettes', sheets: 'Draps et housses',
      removedSub: 'Indiquez ce que vous avez retiré de la chambre (les informations sont seulement enregistrées) :',
      formSub: 'Valeurs de base chargées (ajustez avec + et −).'
    },
    mapView: {
      title: '🗺️ Plan général de l’hôtel', subtitle: 'État des chambres en temps réel.', floor: 'Étage',
      general: 'Vue générale', active: 'Vue active',
      secPriority: '1. Attention prioritaire', secStay: '2. Occupation et séjours', secAvail: '3. Disponibilité et arrivées',
      empty: 'Aucune chambre', changeTitle: 'Changer le statut',
      status: {
        checkout: 'Départ / Check-out', cleaning: 'En nettoyage', ready: 'Libre et propre',
        occupied: 'Occupée', daily: 'Recouche', blocked: 'Bloquée / Panne'
      }
    },
    tasks: {
      newTitle: '📋 Nouvelle tâche', dept: 'Service', person: 'Personne', message: 'Message de la tâche',
      placeholder: 'Ex : Fuite au lavabo de la ch. 204…', assign: 'Assigner la tâche',
      noPeople: 'Aucun employé enregistré dans ce service.'
    },
    staff: {
      title: '👥 Équipe et contrats', addTitle: 'Ajouter un contrat', name: 'Nom de l’employé', namePH: 'Ex : Laura',
      role: 'Poste', save: 'Enregistrer', listTitle: 'Employés enregistrés', empty: 'Aucun employé pour le moment.'
    },
    planning: {
      title: '📅 Planning', week: 'Sem.', hint: 'Touchez une case pour changer le service.', hintView: 'Consultez votre planning.',
      am: 'Matin', pm: 'Après-midi', off: 'Repos', leave: 'Congés', hours: 'h', noStaff: 'Aucun employé dans le planning.',
      months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
      days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    },
    inventory: {
      title: '🧺 Ustensiles de l’hôtel', sub: 'Cette liste sert de base au personnel de nettoyage.',
      add: 'Ajouter un ustensile', newPH: 'Nom de l’ustensile', qty: 'Quantité de base'
    },
    items: {
      largeTowels: 'Grande serviette', mediumTowels: 'Serviette moyenne', faceTowels: 'Serviette de visage', bathMat: 'Tapis de bain',
      bathrobe: 'Peignoir', blackSheet2xl: 'Drap 2XL noir 310 cm', blackSheetL: 'Drap L noir 280 cm', greenSheetL: 'Drap L vert 240 cm',
      yellowDuvet: 'Housse de couette jaune 290 cm', redDuvet: 'Housse de couette rouge 270 cm', orangeDuvet: 'Housse de couette orange 180 cm',
      pillowcases: 'Taie d’oreiller 50 × 72 cm'
    },
    maintenance: {
      title: '🔧 Maintenance et réparations', sub: 'Enregistrez vos interventions par chambre et informez la gouvernante.',
      roomsList: 'Liste des chambres', addReport: 'Rapport', reportPH: 'Ex : Ampoule changée, robinet réparé…',
      send: 'Envoyer à la gouvernante', reportsTitle: '📝 Rapports de maintenance', reportsEmpty: 'Aucun rapport.',
      blockedTitle: 'Chambres bloquées', noBlocked: 'Aucune chambre bloquée.', from: 'De'
    }
  },

  en: {
    login: {
      welcome: 'Welcome', sub: 'Sign in', userLabel: 'User', userPlaceholder: 'Enter your username',
      pinLabel: 'PIN', btn: 'Access', back: 'Back',
      pickName: 'Select your name to sign in',
      noStaff: 'Management has not registered any employee for this profile yet.'
    },
    appTitle: 'Hôtel Villa Genesis',
    subtitle: 'Select your operational profile to start',
    enter: 'Open profile →',
    footerLinks: { help: '❓ Help & Support', terms: '⚖️ Terms & Conditions' },
    modalHelp: { title: 'Help & Support', content: 'Contact technical support at +33 4 93 00 00 00', close: 'Close' },
    modalTerms: {
      title: 'General Terms of Use',
      clauses: [
        '1. Exclusive use: the application is reserved for authorized staff of Hôtel Villa Genesis and its partner hotels.',
        '2. Confidentiality: guest, room and operational data must not be disclosed or used outside the professional context.',
        '3. Personal accounts: each employee is responsible for their session and must log out at the end of their shift.',
        '4. Data protection: personal data is processed only for operational management, in accordance with the GDPR. You may exercise your rights of access and rectification through management.',
        '5. Liability and changes: the application is provided as is and may be updated at any time. Misuse may result in suspension of access.'
      ],
      close: 'Close'
    },
    roles: {
      direction: { title: 'Management', subtitle: 'Executive overview, staff and map' },
      reception: { title: 'Reception', subtitle: 'Hotel map and room status' },
      governess: { title: 'Head Housekeeper', subtitle: 'Supervision, inspection, tasks and planning' },
      cleaning: { title: 'Housekeeping', subtitle: 'Rooms, linen and status' },
      equipier: { title: 'Floor Assistant', subtitle: 'Supplies, laundry and tasks' },
      maintenance: { title: 'Maintenance', subtitle: 'Repairs and reports' }
    },
    feed: {
      logout: 'Log out', location: 'Menton, French Riviera', syncBtn: 'Sync with central',
      tabDashboard: '📊 Dashboard', tabMap: '🗺️ Map', tabPlanning: '📅 Planning', tabStaff: '👥 Team', tabItems: '🧺 Supplies',
      online: 'Online'
    },
    common: { cancel: 'Cancel', save: 'Save', room: 'Rm', role: 'Role: ', staff: 'Staff', shift: 'Shift', for: 'For' },
    alerts: {
      noPermission: 'Notice: you do not have permission to perform this action.',
      roomBlocked: '⚠️ Room blocked due to a fault. Maintenance must release it first.',
      taskEmpty: 'Write the task message.',
      taskSent: '📋 Task sent to the selected person.',
      linenSaved: '✅ Information saved.',
      reportSent: '🔧 Report sent to the head housekeeper.',
      reportEmpty: 'Write the report before sending it.',
      nameRequired: 'Enter a name.',
      synced: '✅ Changes saved successfully.'
    },
    dashboard: {
      directionTitle: 'Management Overview', directionSub: 'Key metrics and general hotel status.',
      occupancy: 'Current occupancy', checkInOut: 'Check-ins / check-outs today', maintenanceIssues: 'Maintenance issues',
      opsStatus: '🟢 Operations status: normal and synced.',
      governessTitle: 'Head Housekeeper Control Panel',
      governessSub: 'General floor supervision, inspections and orders to departments.',
      activeTasksTitle: '📋 General list of active tasks',
      inspectionTitle: '🏨 Inspection and fault blocking',
      shiftTitle: '📋 Shift and assigned rooms',
      assignedRoomsTitle: 'Rooms assigned for today:',
      myTasksTitle: '📥 Tasks assigned to you by the head housekeeper',
      equipierTitle: '🧺 Supplies and linen', equipierSub: 'Stock management on floors and general laundry.',
      completed: 'Completed', pending: 'Pending', approved: '✅ Approved', inspect: '🔍 Inspect',
      block: '🔒 Block', unblock: '🔓 Unblock', resolveUnlock: '🔓 Resolve and unblock',
      prevRecord: '📋 Previous record: ', noLinen: '📋 No linen records.',
      blockedTag: '🔒 [BLOCKED]', blockedWarning: '⚠️ Room temporarily blocked for maintenance.',
      dailyInfo: 'ℹ️ Daily cleaning: no inspection required.', inspectionInfo: '🔍 Requires check-out/check-in inspection.',
      guestLabel: 'Guest: ', cleaningLabel: 'Cleaning: ', statusLabel: 'Status: ',
      taskTypes: { inOut: 'Check-out and check-in', daily: 'Daily cleaning', out: 'Check-out' },
      work: { notDone: 'Not done yet', inCleaning: 'Being cleaned', done: 'Done' }
    },
    cleaning: {
      towels: 'Towels', sheets: 'Sheets and covers',
      removedSub: 'Enter what you removed from the room (the information is only saved):',
      formSub: 'Base values loaded (adjust with + and −).'
    },
    mapView: {
      title: '🗺️ General Hotel Map', subtitle: 'Real-time room status.', floor: 'Floor',
      general: 'General view', active: 'Active view',
      secPriority: '1. Priority attention', secStay: '2. Occupancy and stays', secAvail: '3. Availability and check-in',
      empty: 'No rooms', changeTitle: 'Change status',
      status: {
        checkout: 'Check-out', cleaning: 'Being cleaned', ready: 'Vacant and clean',
        occupied: 'Occupied', daily: 'Daily cleaning', blocked: 'Blocked / Out of order'
      }
    },
    tasks: {
      newTitle: '📋 New task', dept: 'Department', person: 'Person', message: 'Task message',
      placeholder: 'E.g.: Leaking sink in room 204…', assign: 'Assign task',
      noPeople: 'No employees registered in this department.'
    },
    staff: {
      title: '👥 Team and contracts', addTitle: 'Add contract', name: 'Employee name', namePH: 'E.g.: Laura',
      role: 'Position', save: 'Register', listTitle: 'Registered employees', empty: 'No employees yet.'
    },
    planning: {
      title: '📅 Planning', week: 'Wk', hint: 'Tap a cell to change the shift.', hintView: 'Check your schedule.',
      am: 'Morning', pm: 'Afternoon', off: 'Day off', leave: 'Vacation', hours: 'h', noStaff: 'No employees in the planning.',
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    inventory: {
      title: '🧺 Hotel supplies', sub: 'This list is the base used by the housekeeping staff.',
      add: 'Add item', newPH: 'Item name', qty: 'Base quantity'
    },
    items: {
      largeTowels: 'Large towel', mediumTowels: 'Medium towel', faceTowels: 'Face towel', bathMat: 'Bath mat',
      bathrobe: 'Bathrobe', blackSheet2xl: 'Black sheet 2XL 310 cm', blackSheetL: 'Black sheet L 280 cm', greenSheetL: 'Green sheet L 240 cm',
      yellowDuvet: 'Yellow duvet cover 290 cm', redDuvet: 'Red duvet cover 270 cm', orangeDuvet: 'Orange duvet cover 180 cm',
      pillowcases: 'Pillowcase 50 × 72 cm'
    },
    maintenance: {
      title: '🔧 Maintenance and repairs', sub: 'Log your repairs per room and inform the head housekeeper.',
      roomsList: 'Room list', addReport: 'Report', reportPH: 'E.g.: Bulb replaced, tap repaired…',
      send: 'Send to head housekeeper', reportsTitle: '📝 Maintenance reports', reportsEmpty: 'No reports.',
      blockedTitle: 'Blocked rooms', noBlocked: 'No blocked rooms.', from: 'From'
    }
  },

  it: {
    login: {
      welcome: 'Benvenuto', sub: 'Accedi', userLabel: 'Utente', userPlaceholder: 'Inserisci il tuo nome utente',
      pinLabel: 'PIN', btn: 'Accedi', back: 'Indietro',
      pickName: 'Seleziona il tuo nome per entrare',
      noStaff: 'La direzione non ha ancora registrato alcun dipendente per questo profilo.'
    },
    appTitle: 'Hôtel Villa Genesis',
    subtitle: 'Seleziona il tuo profilo operativo per iniziare',
    enter: 'Accedi al profilo →',
    footerLinks: { help: '❓ Aiuto e supporto', terms: '⚖️ Termini e condizioni' },
    modalHelp: { title: 'Aiuto e supporto', content: 'Contatta il supporto tecnico al +33 4 93 00 00 00', close: 'Chiudi' },
    modalTerms: {
      title: 'Condizioni generali d’uso',
      clauses: [
        '1. Uso esclusivo: l’applicazione è riservata al personale autorizzato dell’Hôtel Villa Genesis e degli hotel partner.',
        '2. Riservatezza: i dati di ospiti, camere e operazioni non possono essere divulgati né utilizzati al di fuori dell’ambito professionale.',
        '3. Account personali: ogni dipendente è responsabile della propria sessione e deve chiuderla al termine del turno.',
        '4. Protezione dei dati: i dati personali sono trattati solo per la gestione operativa, in conformità al GDPR. Puoi esercitare i tuoi diritti di accesso e rettifica presso la direzione.',
        '5. Responsabilità e modifiche: l’applicazione è fornita così com’è e può essere aggiornata in qualsiasi momento. Un uso improprio può comportare la sospensione dell’accesso.'
      ],
      close: 'Chiudi'
    },
    roles: {
      direction: { title: 'Direzione', subtitle: 'Panoramica gestionale, personale e mappa' },
      reception: { title: 'Ricevimento', subtitle: 'Mappa dell’hotel e stato delle camere' },
      governess: { title: 'Governante', subtitle: 'Supervisione, ispezione, attività e planning' },
      cleaning: { title: 'Addetto alle pulizie', subtitle: 'Camere, biancheria e stati' },
      equipier: { title: 'Equipier', subtitle: 'Forniture, lavanderia e attività' },
      maintenance: { title: 'Manutenzione', subtitle: 'Riparazioni e rapporti' }
    },
    feed: {
      logout: 'Disconnetti', location: 'Mentone, Costa Azzurra', syncBtn: 'Sincronizza con la centrale',
      tabDashboard: '📊 Pannello', tabMap: '🗺️ Mappa', tabPlanning: '📅 Planning', tabStaff: '👥 Team', tabItems: '🧺 Utensili',
      online: 'Online'
    },
    common: { cancel: 'Annulla', save: 'Salva', room: 'Cam.', role: 'Ruolo: ', staff: 'Personale', shift: 'Turno', for: 'Per' },
    alerts: {
      noPermission: 'Avviso: non hai il permesso di eseguire questa azione.',
      roomBlocked: '⚠️ Camera bloccata per guasto. La manutenzione deve prima sbloccarla.',
      taskEmpty: 'Scrivi il messaggio dell’attività.',
      taskSent: '📋 Attività inviata alla persona selezionata.',
      linenSaved: '✅ Informazioni salvate.',
      reportSent: '🔧 Rapporto inviato alla governante.',
      reportEmpty: 'Scrivi il rapporto prima di inviarlo.',
      nameRequired: 'Inserisci un nome.',
      synced: '✅ Modifiche salvate con successo.'
    },
    dashboard: {
      directionTitle: 'Panoramica gestionale', directionSub: 'Metriche chiave e stato generale dell’hotel.',
      occupancy: 'Occupazione attuale', checkInOut: 'Arrivi / partenze oggi', maintenanceIssues: 'Problemi di manutenzione',
      opsStatus: '🟢 Stato delle operazioni: normale e sincronizzato.',
      governessTitle: 'Pannello di controllo della governante',
      governessSub: 'Supervisione generale dei piani, ispezioni e ordini ai reparti.',
      activeTasksTitle: '📋 Elenco generale delle attività attive',
      inspectionTitle: '🏨 Ispezione e blocco per guasti',
      shiftTitle: '📋 Turno e camere assegnate',
      assignedRoomsTitle: 'Camere assegnate per oggi:',
      myTasksTitle: '📥 Attività assegnate dalla governante',
      equipierTitle: '🧺 Forniture e biancheria', equipierSub: 'Gestione delle scorte ai piani e lavanderia generale.',
      completed: 'Completata', pending: 'In attesa', approved: '✅ Approvata', inspect: '🔍 Ispeziona',
      block: '🔒 Blocca', unblock: '🔓 Sblocca', resolveUnlock: '🔓 Risolvi e sblocca',
      prevRecord: '📋 Registro precedente: ', noLinen: '📋 Nessun registro di biancheria.',
      blockedTag: '🔒 [BLOCCATA]', blockedWarning: '⚠️ Camera temporaneamente bloccata per manutenzione.',
      dailyInfo: 'ℹ️ Pulizia giornaliera: nessuna ispezione richiesta.', inspectionInfo: '🔍 Richiede ispezione di partenza/arrivo.',
      guestLabel: 'Ospite: ', cleaningLabel: 'Pulizia: ', statusLabel: 'Stato: ',
      taskTypes: { inOut: 'Partenza e arrivo', daily: 'Pulizia giornaliera', out: 'Partenza' },
      work: { notDone: 'Non ancora fatto', inCleaning: 'In pulizia', done: 'Fatto' }
    },
    cleaning: {
      towels: 'Asciugamani', sheets: 'Lenzuola e federe',
      removedSub: 'Indica cosa hai ritirato dalla camera (le informazioni vengono solo salvate):',
      formSub: 'Valori di base caricati (regola con + e −).'
    },
    mapView: {
      title: '🗺️ Mappa generale dell’hotel', subtitle: 'Stato delle camere in tempo reale.', floor: 'Piano',
      general: 'Vista generale', active: 'Vista attiva',
      secPriority: '1. Attenzione prioritaria', secStay: '2. Occupazione e soggiorni', secAvail: '3. Disponibilità e check-in',
      empty: 'Nessuna camera', changeTitle: 'Cambia stato',
      status: {
        checkout: 'Partenza / Check-out', cleaning: 'In pulizia', ready: 'Libera e pulita',
        occupied: 'Occupata', daily: 'Pulizia giornaliera', blocked: 'Bloccata / Guasto'
      }
    },
    tasks: {
      newTitle: '📋 Nuova attività', dept: 'Reparto', person: 'Persona', message: 'Messaggio dell’attività',
      placeholder: 'Es.: Perdita nel lavabo della cam. 204…', assign: 'Assegna attività',
      noPeople: 'Nessun dipendente registrato in questo reparto.'
    },
    staff: {
      title: '👥 Team e contratti', addTitle: 'Aggiungi contratto', name: 'Nome del dipendente', namePH: 'Es.: Laura',
      role: 'Posizione', save: 'Registra', listTitle: 'Dipendenti registrati', empty: 'Ancora nessun dipendente.'
    },
    planning: {
      title: '📅 Planning', week: 'Sett.', hint: 'Tocca una casella per cambiare il turno.', hintView: 'Consulta il tuo orario.',
      am: 'Mattina', pm: 'Pomeriggio', off: 'Riposo', leave: 'Ferie', hours: 'h', noStaff: 'Nessun dipendente nel planning.',
      months: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
      days: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
    },
    inventory: {
      title: '🧺 Utensili dell’hotel', sub: 'Questo elenco è la base utilizzata dal personale di pulizia.',
      add: 'Aggiungi utensile', newPH: 'Nome dell’utensile', qty: 'Quantità base'
    },
    items: {
      largeTowels: 'Asciugamano grande', mediumTowels: 'Asciugamano medio', faceTowels: 'Asciugamano viso', bathMat: 'Tappetino da bagno',
      bathrobe: 'Accappatoio', blackSheet2xl: 'Lenzuolo 2XL nero 310 cm', blackSheetL: 'Lenzuolo L nero 280 cm', greenSheetL: 'Lenzuolo L verde 240 cm',
      yellowDuvet: 'Copripiumino giallo 290 cm', redDuvet: 'Copripiumino rosso 270 cm', orangeDuvet: 'Copripiumino arancione 180 cm',
      pillowcases: 'Federa 50 × 72 cm'
    },
    maintenance: {
      title: '🔧 Manutenzione e riparazioni', sub: 'Registra le tue riparazioni per camera e informa la governante.',
      roomsList: 'Elenco delle camere', addReport: 'Rapporto', reportPH: 'Es.: Lampadina sostituita, rubinetto riparato…',
      send: 'Invia alla governante', reportsTitle: '📝 Rapporti di manutenzione', reportsEmpty: 'Nessun rapporto.',
      blockedTitle: 'Camere bloccate', noBlocked: 'Nessuna camera bloccata.', from: 'Da'
    }
  },

  pt: {
    login: {
      welcome: 'Bem-vindo', sub: 'Entrar', userLabel: 'Usuário', userPlaceholder: 'Digite seu usuário',
      pinLabel: 'PIN', btn: 'Acessar', back: 'Voltar',
      pickName: 'Selecione seu nome para entrar',
      noStaff: 'A direção ainda não cadastrou nenhum funcionário para este perfil.'
    },
    appTitle: 'Hôtel Villa Genesis',
    subtitle: 'Selecione seu perfil operacional para começar',
    enter: 'Acessar o perfil →',
    footerLinks: { help: '❓ Ajuda e suporte', terms: '⚖️ Termos e condições' },
    modalHelp: { title: 'Ajuda e suporte', content: 'Entre em contato com o suporte técnico pelo +33 4 93 00 00 00', close: 'Fechar' },
    modalTerms: {
      title: 'Condições gerais de uso',
      clauses: [
        '1. Uso exclusivo: o aplicativo é reservado à equipe autorizada do Hôtel Villa Genesis e dos hotéis parceiros.',
        '2. Confidencialidade: os dados de hóspedes, quartos e operações não podem ser divulgados nem utilizados fora do âmbito profissional.',
        '3. Contas pessoais: cada funcionário é responsável por sua sessão e deve encerrá-la ao final do turno.',
        '4. Proteção de dados: os dados pessoais são tratados apenas para a gestão operacional, em conformidade com o RGPD. Você pode exercer seus direitos de acesso e retificação junto à direção.',
        '5. Responsabilidade e alterações: o aplicativo é fornecido no estado em que se encontra e pode ser atualizado a qualquer momento. O uso indevido pode resultar na suspensão do acesso.'
      ],
      close: 'Fechar'
    },
    roles: {
      direction: { title: 'Direção', subtitle: 'Visão gerencial, equipe e mapa' },
      reception: { title: 'Recepção', subtitle: 'Mapa do hotel e estado dos quartos' },
      governess: { title: 'Governanta', subtitle: 'Supervisão, inspeção, tarefas e planning' },
      cleaning: { title: 'Agente de limpeza', subtitle: 'Quartos, enxoval e status' },
      equipier: { title: 'Equipier', subtitle: 'Suprimentos, lavanderia e tarefas' },
      maintenance: { title: 'Manutenção', subtitle: 'Reparos e relatórios' }
    },
    feed: {
      logout: 'Sair', location: 'Menton, Costa Azul', syncBtn: 'Sincronizar com a central',
      tabDashboard: '📊 Painel', tabMap: '🗺️ Mapa', tabPlanning: '📅 Planning', tabStaff: '👥 Equipe', tabItems: '🧺 Utensílios',
      online: 'Online'
    },
    common: { cancel: 'Cancelar', save: 'Salvar', room: 'Qto.', role: 'Cargo: ', staff: 'Funcionário', shift: 'Turno', for: 'Para' },
    alerts: {
      noPermission: 'Aviso: você não tem permissão para realizar esta ação.',
      roomBlocked: '⚠️ Quarto bloqueado por avaria. A manutenção deve liberá-lo primeiro.',
      taskEmpty: 'Escreva a mensagem da tarefa.',
      taskSent: '📋 Tarefa enviada à pessoa selecionada.',
      linenSaved: '✅ Informações salvas.',
      reportSent: '🔧 Relatório enviado à governanta.',
      reportEmpty: 'Escreva o relatório antes de enviá-lo.',
      nameRequired: 'Digite um nome.',
      synced: '✅ Alterações salvas com sucesso.'
    },
    dashboard: {
      directionTitle: 'Visão geral gerencial', directionSub: 'Métricas-chave e estado geral do hotel.',
      occupancy: 'Ocupação atual', checkInOut: 'Entradas / saídas hoje', maintenanceIssues: 'Ocorrências de manutenção',
      opsStatus: '🟢 Estado das operações: normal e sincronizado.',
      governessTitle: 'Painel de controle da governanta',
      governessSub: 'Supervisão geral dos andares, inspeções e ordens aos departamentos.',
      activeTasksTitle: '📋 Lista geral de tarefas ativas',
      inspectionTitle: '🏨 Inspeção e bloqueio por avarias',
      shiftTitle: '📋 Turno e quartos atribuídos',
      assignedRoomsTitle: 'Quartos atribuídos para hoje:',
      myTasksTitle: '📥 Tarefas atribuídas pela governanta',
      equipierTitle: '🧺 Suprimentos e enxoval', equipierSub: 'Gestão de estoque nos andares e lavanderia geral.',
      completed: 'Concluída', pending: 'Pendente', approved: '✅ Aprovada', inspect: '🔍 Inspecionar',
      block: '🔒 Bloquear', unblock: '🔓 Desbloquear', resolveUnlock: '🔓 Resolver e desbloquear',
      prevRecord: '📋 Registro anterior: ', noLinen: '📋 Sem registros de enxoval.',
      blockedTag: '🔒 [BLOQUEADO]', blockedWarning: '⚠️ Quarto temporariamente bloqueado por manutenção.',
      dailyInfo: 'ℹ️ Limpeza diária: não requer inspeção.', inspectionInfo: '🔍 Requer inspeção de saída/entrada.',
      guestLabel: 'Hóspede: ', cleaningLabel: 'Limpeza: ', statusLabel: 'Status: ',
      taskTypes: { inOut: 'Saída e entrada', daily: 'Limpeza diária', out: 'Saída' },
      work: { notDone: 'Ainda não feito', inCleaning: 'Em limpeza', done: 'Feito' }
    },
    cleaning: {
      towels: 'Toalhas', sheets: 'Lençóis e fronhas',
      removedSub: 'Indique o que você retirou do quarto (as informações apenas são salvas):',
      formSub: 'Valores base carregados (ajuste com + e −).'
    },
    mapView: {
      title: '🗺️ Mapa geral do hotel', subtitle: 'Estado dos quartos em tempo real.', floor: 'Andar',
      general: 'Visão geral', active: 'Visão ativa',
      secPriority: '1. Atenção prioritária', secStay: '2. Ocupação e hospedagens', secAvail: '3. Disponibilidade e check-in',
      empty: 'Sem quartos', changeTitle: 'Alterar status',
      status: {
        checkout: 'Saída / Check-out', cleaning: 'Em limpeza', ready: 'Livre e limpo',
        occupied: 'Ocupado', daily: 'Limpeza diária', blocked: 'Bloqueado / Avaria'
      }
    },
    tasks: {
      newTitle: '📋 Nova tarefa', dept: 'Departamento', person: 'Pessoa', message: 'Mensagem da tarefa',
      placeholder: 'Ex.: Vazamento na pia do quarto 204…', assign: 'Atribuir tarefa',
      noPeople: 'Nenhum funcionário cadastrado neste departamento.'
    },
    staff: {
      title: '👥 Equipe e contratos', addTitle: 'Adicionar contrato', name: 'Nome do funcionário', namePH: 'Ex.: Laura',
      role: 'Cargo', save: 'Cadastrar', listTitle: 'Funcionários cadastrados', empty: 'Ainda não há funcionários.'
    },
    planning: {
      title: '📅 Planning', week: 'Sem.', hint: 'Toque em uma célula para mudar o turno.', hintView: 'Consulte seu horário.',
      am: 'Manhã', pm: 'Tarde', off: 'Folga', leave: 'Férias', hours: 'h', noStaff: 'Nenhum funcionário no planning.',
      months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
      days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    },
    inventory: {
      title: '🧺 Utensílios do hotel', sub: 'Esta lista é a base usada pela equipe de limpeza.',
      add: 'Adicionar utensílio', newPH: 'Nome do utensílio', qty: 'Quantidade base'
    },
    items: {
      largeTowels: 'Toalha grande', mediumTowels: 'Toalha média', faceTowels: 'Toalha de rosto', bathMat: 'Tapete de banho',
      bathrobe: 'Roupão', blackSheet2xl: 'Lençol 2XL preto 310 cm', blackSheetL: 'Lençol L preto 280 cm', greenSheetL: 'Lençol L verde 240 cm',
      yellowDuvet: 'Capa de edredom amarela 290 cm', redDuvet: 'Capa de edredom vermelha 270 cm', orangeDuvet: 'Capa de edredom laranja 180 cm',
      pillowcases: 'Fronha 50 × 72 cm'
    },
    maintenance: {
      title: '🔧 Manutenção e reparos', sub: 'Registre seus reparos por quarto e informe a governanta.',
      roomsList: 'Lista de quartos', addReport: 'Relatório', reportPH: 'Ex.: Lâmpada trocada, torneira consertada…',
      send: 'Enviar à governanta', reportsTitle: '📝 Relatórios de manutenção', reportsEmpty: 'Sem relatórios.',
      blockedTitle: 'Quartos bloqueados', noBlocked: 'Não há quartos bloqueados.', from: 'De'
    }
  },

  ru: {
    login: {
      welcome: 'Добро пожаловать', sub: 'Вход', userLabel: 'Пользователь', userPlaceholder: 'Введите имя пользователя',
      pinLabel: 'ПИН-код', btn: 'Войти', back: 'Назад',
      pickName: 'Выберите своё имя для входа',
      noStaff: 'Руководство ещё не добавило ни одного сотрудника для этого профиля.'
    },
    appTitle: 'Hôtel Villa Genesis',
    subtitle: 'Выберите свой рабочий профиль, чтобы начать',
    enter: 'Открыть профиль →',
    footerLinks: { help: '❓ Помощь и поддержка', terms: '⚖️ Условия использования' },
    modalHelp: { title: 'Помощь и поддержка', content: 'Свяжитесь с технической поддержкой по телефону +33 4 93 00 00 00', close: 'Закрыть' },
    modalTerms: {
      title: 'Общие условия использования',
      clauses: [
        '1. Исключительное использование: приложение предназначено только для авторизованных сотрудников Hôtel Villa Genesis и отелей-партнёров.',
        '2. Конфиденциальность: данные о гостях, номерах и операциях нельзя разглашать или использовать вне профессиональной деятельности.',
        '3. Личные учётные записи: каждый сотрудник отвечает за свой сеанс и должен выходить из системы по окончании смены.',
        '4. Защита данных: персональные данные обрабатываются только для оперативного управления в соответствии с GDPR. Вы можете реализовать свои права на доступ и исправление через руководство.',
        '5. Ответственность и изменения: приложение предоставляется «как есть» и может обновляться в любое время. Ненадлежащее использование может привести к блокировке доступа.'
      ],
      close: 'Закрыть'
    },
    roles: {
      direction: { title: 'Руководство', subtitle: 'Обзор, персонал и план отеля' },
      reception: { title: 'Рецепция', subtitle: 'План отеля и статус номеров' },
      governess: { title: 'Старшая горничная', subtitle: 'Контроль, проверка, задачи и расписание' },
      cleaning: { title: 'Горничная', subtitle: 'Номера, бельё и статусы' },
      equipier: { title: 'Помощник по этажам', subtitle: 'Снабжение, прачечная и задачи' },
      maintenance: { title: 'Техническая служба', subtitle: 'Ремонт и отчёты' }
    },
    feed: {
      logout: 'Выйти', location: 'Ментона, Лазурный Берег', syncBtn: 'Синхронизировать с центром',
      tabDashboard: '📊 Панель', tabMap: '🗺️ План', tabPlanning: '📅 Расписание', tabStaff: '👥 Команда', tabItems: '🧺 Инвентарь',
      online: 'В сети'
    },
    common: { cancel: 'Отмена', save: 'Сохранить', room: 'Ном.', role: 'Должность: ', staff: 'Сотрудник', shift: 'Смена', for: 'Для' },
    alerts: {
      noPermission: 'Внимание: у вас нет прав для этого действия.',
      roomBlocked: '⚠️ Номер заблокирован из-за неисправности. Сначала его должна разблокировать техническая служба.',
      taskEmpty: 'Напишите текст задачи.',
      taskSent: '📋 Задача отправлена выбранному сотруднику.',
      linenSaved: '✅ Информация сохранена.',
      reportSent: '🔧 Отчёт отправлен старшей горничной.',
      reportEmpty: 'Напишите отчёт перед отправкой.',
      nameRequired: 'Введите имя.',
      synced: '✅ Изменения успешно сохранены.'
    },
    dashboard: {
      directionTitle: 'Обзор для руководства', directionSub: 'Ключевые показатели и общее состояние отеля.',
      occupancy: 'Текущая загрузка', checkInOut: 'Заезды / выезды сегодня', maintenanceIssues: 'Проблемы технической службы',
      opsStatus: '🟢 Статус операций: в норме, синхронизировано.',
      governessTitle: 'Панель управления старшей горничной',
      governessSub: 'Общий контроль этажей, проверки и поручения отделам.',
      activeTasksTitle: '📋 Общий список активных задач',
      inspectionTitle: '🏨 Проверка и блокировка при неисправностях',
      shiftTitle: '📋 Смена и закреплённые номера',
      assignedRoomsTitle: 'Номера, закреплённые на сегодня:',
      myTasksTitle: '📥 Задачи от старшей горничной',
      equipierTitle: '🧺 Снабжение и бельё', equipierSub: 'Управление запасами на этажах и общая прачечная.',
      completed: 'Выполнено', pending: 'В ожидании', approved: '✅ Одобрено', inspect: '🔍 Проверить',
      block: '🔒 Заблокировать', unblock: '🔓 Разблокировать', resolveUnlock: '🔓 Устранить и разблокировать',
      prevRecord: '📋 Предыдущая запись: ', noLinen: '📋 Нет записей о белье.',
      blockedTag: '🔒 [ЗАБЛОКИРОВАН]', blockedWarning: '⚠️ Номер временно заблокирован на время ремонта.',
      dailyInfo: 'ℹ️ Ежедневная уборка: проверка не требуется.', inspectionInfo: '🔍 Требуется проверка при выезде/заезде.',
      guestLabel: 'Гость: ', cleaningLabel: 'Уборка: ', statusLabel: 'Статус: ',
      taskTypes: { inOut: 'Выезд и заезд', daily: 'Ежедневная уборка', out: 'Выезд' },
      work: { notDone: 'Ещё не сделано', inCleaning: 'Идёт уборка', done: 'Готово' }
    },
    cleaning: {
      towels: 'Полотенца', sheets: 'Простыни и наволочки',
      removedSub: 'Укажите, что вы убрали из номера (информация только сохраняется):',
      formSub: 'Базовые значения загружены (меняйте кнопками + и −).'
    },
    mapView: {
      title: '🗺️ Общий план отеля', subtitle: 'Статус номеров в реальном времени.', floor: 'Этаж',
      general: 'Общий вид', active: 'Активный вид',
      secPriority: '1. Приоритетное внимание', secStay: '2. Занятость и проживание', secAvail: '3. Доступность и заезд',
      empty: 'Нет номеров', changeTitle: 'Изменить статус',
      status: {
        checkout: 'Выезд / Check-out', cleaning: 'Идёт уборка', ready: 'Свободен и убран',
        occupied: 'Занят', daily: 'Ежедневная уборка', blocked: 'Заблокирован / Неисправность'
      }
    },
    tasks: {
      newTitle: '📋 Новая задача', dept: 'Отдел', person: 'Сотрудник', message: 'Текст задачи',
      placeholder: 'Напр.: Течёт раковина в номере 204…', assign: 'Назначить задачу',
      noPeople: 'В этом отделе нет зарегистрированных сотрудников.'
    },
    staff: {
      title: '👥 Команда и договоры', addTitle: 'Добавить договор', name: 'Имя сотрудника', namePH: 'Напр.: Лаура',
      role: 'Должность', save: 'Зарегистрировать', listTitle: 'Зарегистрированные сотрудники', empty: 'Сотрудников пока нет.'
    },
    planning: {
      title: '📅 Расписание', week: 'Нед.', hint: 'Нажмите на ячейку, чтобы изменить смену.', hintView: 'Посмотрите своё расписание.',
      am: 'Утро', pm: 'День', off: 'Выходной', leave: 'Отпуск', hours: 'ч', noStaff: 'В расписании нет сотрудников.',
      months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
      days: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    },
    inventory: {
      title: '🧺 Инвентарь отеля', sub: 'Этот список используется персоналом по уборке как основа.',
      add: 'Добавить предмет', newPH: 'Название предмета', qty: 'Базовое количество'
    },
    items: {
      largeTowels: 'Большое полотенце', mediumTowels: 'Среднее полотенце', faceTowels: 'Полотенце для лица', bathMat: 'Коврик для ванной',
      bathrobe: 'Халат', blackSheet2xl: 'Простыня 2XL чёрная 310 см', blackSheetL: 'Простыня L чёрная 280 см', greenSheetL: 'Простыня L зелёная 240 см',
      yellowDuvet: 'Пододеяльник жёлтый 290 см', redDuvet: 'Пододеяльник красный 270 см', orangeDuvet: 'Пододеяльник оранжевый 180 см',
      pillowcases: 'Наволочка 50 × 72 см'
    },
    maintenance: {
      title: '🔧 Техническая служба и ремонт', sub: 'Записывайте ремонты по номерам и сообщайте старшей горничной.',
      roomsList: 'Список номеров', addReport: 'Отчёт', reportPH: 'Напр.: Заменена лампа, починен кран…',
      send: 'Отправить старшей горничной', reportsTitle: '📝 Отчёты технической службы', reportsEmpty: 'Отчётов нет.',
      blockedTitle: 'Заблокированные номера', noBlocked: 'Заблокированных номеров нет.', from: 'От'
    }
  },

  uk: {
    login: {
      welcome: 'Ласкаво просимо', sub: 'Вхід', userLabel: 'Користувач', userPlaceholder: 'Введіть ім’я користувача',
      pinLabel: 'ПІН-код', btn: 'Увійти', back: 'Назад',
      pickName: 'Виберіть своє ім’я для входу',
      noStaff: 'Керівництво ще не додало жодного працівника для цього профілю.'
    },
    appTitle: 'Hôtel Villa Genesis',
    subtitle: 'Виберіть свій робочий профіль, щоб почати',
    enter: 'Відкрити профіль →',
    footerLinks: { help: '❓ Допомога та підтримка', terms: '⚖️ Умови використання' },
    modalHelp: { title: 'Допомога та підтримка', content: 'Зв’яжіться з технічною підтримкою за номером +33 4 93 00 00 00', close: 'Закрити' },
    modalTerms: {
      title: 'Загальні умови використання',
      clauses: [
        '1. Виключне використання: застосунок призначений лише для уповноважених працівників Hôtel Villa Genesis та готелів-партнерів.',
        '2. Конфіденційність: дані про гостей, номери та операції не можна розголошувати чи використовувати поза професійною діяльністю.',
        '3. Особисті облікові записи: кожен працівник відповідає за свій сеанс і має виходити з системи після завершення зміни.',
        '4. Захист даних: персональні дані обробляються лише для оперативного управління відповідно до GDPR. Ви можете реалізувати свої права на доступ і виправлення через керівництво.',
        '5. Відповідальність і зміни: застосунок надається «як є» і може оновлюватися в будь-який час. Неналежне використання може призвести до блокування доступу.'
      ],
      close: 'Закрити'
    },
    roles: {
      direction: { title: 'Керівництво', subtitle: 'Огляд, персонал і план готелю' },
      reception: { title: 'Рецепція', subtitle: 'План готелю та статус номерів' },
      governess: { title: 'Старша покоївка', subtitle: 'Контроль, перевірка, завдання та розклад' },
      cleaning: { title: 'Покоївка', subtitle: 'Номери, білизна та статуси' },
      equipier: { title: 'Помічник на поверсі', subtitle: 'Постачання, пральня та завдання' },
      maintenance: { title: 'Технічна служба', subtitle: 'Ремонт і звіти' }
    },
    feed: {
      logout: 'Вийти', location: 'Ментона, Лазурний Берег', syncBtn: 'Синхронізувати з центром',
      tabDashboard: '📊 Панель', tabMap: '🗺️ План', tabPlanning: '📅 Розклад', tabStaff: '👥 Команда', tabItems: '🧺 Інвентар',
      online: 'У мережі'
    },
    common: { cancel: 'Скасувати', save: 'Зберегти', room: 'Кімн.', role: 'Посада: ', staff: 'Працівник', shift: 'Зміна', for: 'Для' },
    alerts: {
      noPermission: 'Увага: у вас немає прав для цієї дії.',
      roomBlocked: '⚠️ Номер заблоковано через несправність. Спочатку його має розблокувати технічна служба.',
      taskEmpty: 'Напишіть текст завдання.',
      taskSent: '📋 Завдання надіслано вибраному працівнику.',
      linenSaved: '✅ Інформацію збережено.',
      reportSent: '🔧 Звіт надіслано старшій покоївці.',
      reportEmpty: 'Напишіть звіт перед надсиланням.',
      nameRequired: 'Введіть ім’я.',
      synced: '✅ Зміни успішно збережено.'
    },
    dashboard: {
      directionTitle: 'Огляд для керівництва', directionSub: 'Ключові показники та загальний стан готелю.',
      occupancy: 'Поточна заповнюваність', checkInOut: 'Заїзди / виїзди сьогодні', maintenanceIssues: 'Проблеми технічної служби',
      opsStatus: '🟢 Статус операцій: у нормі, синхронізовано.',
      governessTitle: 'Панель керування старшої покоївки',
      governessSub: 'Загальний контроль поверхів, перевірки та доручення відділам.',
      activeTasksTitle: '📋 Загальний список активних завдань',
      inspectionTitle: '🏨 Перевірка та блокування через несправності',
      shiftTitle: '📋 Зміна та закріплені номери',
      assignedRoomsTitle: 'Номери, закріплені на сьогодні:',
      myTasksTitle: '📥 Завдання від старшої покоївки',
      equipierTitle: '🧺 Постачання та білизна', equipierSub: 'Керування запасами на поверхах і загальна пральня.',
      completed: 'Виконано', pending: 'В очікуванні', approved: '✅ Схвалено', inspect: '🔍 Перевірити',
      block: '🔒 Заблокувати', unblock: '🔓 Розблокувати', resolveUnlock: '🔓 Усунути та розблокувати',
      prevRecord: '📋 Попередній запис: ', noLinen: '📋 Немає записів про білизну.',
      blockedTag: '🔒 [ЗАБЛОКОВАНО]', blockedWarning: '⚠️ Номер тимчасово заблоковано на час ремонту.',
      dailyInfo: 'ℹ️ Щоденне прибирання: перевірка не потрібна.', inspectionInfo: '🔍 Потрібна перевірка при виїзді/заїзді.',
      guestLabel: 'Гість: ', cleaningLabel: 'Прибирання: ', statusLabel: 'Статус: ',
      taskTypes: { inOut: 'Виїзд і заїзд', daily: 'Щоденне прибирання', out: 'Виїзд' },
      work: { notDone: 'Ще не зроблено', inCleaning: 'Триває прибирання', done: 'Готово' }
    },
    cleaning: {
      towels: 'Рушники', sheets: 'Простирадла та наволочки',
      removedSub: 'Вкажіть, що ви прибрали з номера (інформація лише зберігається):',
      formSub: 'Базові значення завантажено (змінюйте кнопками + і −).'
    },
    mapView: {
      title: '🗺️ Загальний план готелю', subtitle: 'Статус номерів у реальному часі.', floor: 'Поверх',
      general: 'Загальний вигляд', active: 'Активний вигляд',
      secPriority: '1. Пріоритетна увага', secStay: '2. Заповнюваність і проживання', secAvail: '3. Доступність і заїзд',
      empty: 'Немає номерів', changeTitle: 'Змінити статус',
      status: {
        checkout: 'Виїзд / Check-out', cleaning: 'Триває прибирання', ready: 'Вільний і прибраний',
        occupied: 'Зайнятий', daily: 'Щоденне прибирання', blocked: 'Заблокований / Несправність'
      }
    },
    tasks: {
      newTitle: '📋 Нове завдання', dept: 'Відділ', person: 'Працівник', message: 'Текст завдання',
      placeholder: 'Напр.: Тече раковина в номері 204…', assign: 'Призначити завдання',
      noPeople: 'У цьому відділі немає зареєстрованих працівників.'
    },
    staff: {
      title: '👥 Команда та договори', addTitle: 'Додати договір', name: 'Ім’я працівника', namePH: 'Напр.: Лаура',
      role: 'Посада', save: 'Зареєструвати', listTitle: 'Зареєстровані працівники', empty: 'Працівників поки немає.'
    },
    planning: {
      title: '📅 Розклад', week: 'Тиж.', hint: 'Натисніть на клітинку, щоб змінити зміну.', hintView: 'Перегляньте свій розклад.',
      am: 'Ранок', pm: 'День', off: 'Вихідний', leave: 'Відпустка', hours: 'г', noStaff: 'У розкладі немає працівників.',
      months: ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'],
      days: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
    },
    inventory: {
      title: '🧺 Інвентар готелю', sub: 'Цей список є основою для персоналу з прибирання.',
      add: 'Додати предмет', newPH: 'Назва предмета', qty: 'Базова кількість'
    },
    items: {
      largeTowels: 'Великий рушник', mediumTowels: 'Середній рушник', faceTowels: 'Рушник для обличчя', bathMat: 'Килимок для ванної',
      bathrobe: 'Халат', blackSheet2xl: 'Простирадло 2XL чорне 310 см', blackSheetL: 'Простирадло L чорне 280 см', greenSheetL: 'Простирадло L зелене 240 см',
      yellowDuvet: 'Підковдра жовта 290 см', redDuvet: 'Підковдра червона 270 см', orangeDuvet: 'Підковдра помаранчева 180 см',
      pillowcases: 'Наволочка 50 × 72 см'
    },
    maintenance: {
      title: '🔧 Технічна служба та ремонт', sub: 'Записуйте ремонти за номерами та повідомляйте старшу покоївку.',
      roomsList: 'Список номерів', addReport: 'Звіт', reportPH: 'Напр.: Замінено лампу, полагоджено кран…',
      send: 'Надіслати старшій покоївці', reportsTitle: '📝 Звіти технічної служби', reportsEmpty: 'Звітів немає.',
      blockedTitle: 'Заблоковані номери', noBlocked: 'Заблокованих номерів немає.', from: 'Від'
    }
  }
};

/* ============================================================
   TEXTOS NUEVOS (ES · EN · FR). Los demás idiomas usan ES como respaldo
   hasta que se traduzcan.
   ============================================================ */
const extraTranslations: Record<string, any> = {
  es: {
    feed: { tabSettings: '⚙️ Ajustes' },
    terms: {
      title: 'Términos y Política de Privacidad',
      intro: 'Para usar Atrium Management debes aceptar los Términos de Servicio y la Política de Privacidad.',
      accept: 'Aceptar y continuar', decline: 'Rechazar',
      declinedTitle: 'Acceso no permitido',
      declinedBody: 'Sin aceptar los términos no puedes utilizar la aplicación. Puedes revisarlos de nuevo cuando quieras.',
      review: 'Revisar de nuevo'
    },
    privacy: {
      title: 'Política de privacidad',
      clauses: [
        '1. Datos que tratamos: nombre, puesto, fechas de contrato, PIN de acceso y datos operativos del hotel (tareas, informes, habitaciones).',
        '2. Finalidad: gestionar la operativa del hotel. No vendemos ni cedemos tus datos a terceros con fines publicitarios.',
        '3. Almacenamiento: los datos se guardan en servicios de Google Firebase (Firestore). Puedes seguir usando la app sin conexión; los cambios se sincronizan al recuperar la red.',
        '4. Tus derechos: puedes consultar y rectificar tus datos con la dirección y eliminar tu cuenta y tus datos en Ajustes → Eliminar cuenta y datos.',
        '5. Contacto: para cualquier consulta sobre privacidad usa el soporte técnico indicado en Ayuda y soporte.'
      ],
      close: 'Cerrar'
    },
    footer: { privacy: '🔒 Privacidad' },
    settings: {
      title: '⚙️ Ajustes y perfil', profile: 'Mi perfil', user: 'Usuario', roleLabel: 'Rol',
      legal: 'Información legal', terms: '⚖️ Términos de servicio', privacy: '🔒 Política de privacidad', help: '❓ Ayuda y soporte',
      danger: 'Zona de peligro'
    },
    account: {
      deleteBtn: '🗑️ Eliminar cuenta y datos',
      deleteInfoStaff: 'Se eliminarán tu ficha de empleado, tu PIN y las tareas que tengas asignadas. Esta acción no se puede deshacer.',
      deleteInfoDirection: 'Se eliminarán TODOS los datos del hotel en la nube: equipo, tareas, informes y las credenciales de dirección y recepción. Esta acción no se puede deshacer.',
      deleteInfoReception: 'Se eliminará el PIN de recepción y los datos locales de este dispositivo. La dirección podrá crear uno nuevo.',
      confirmTitle: '¿Eliminar cuenta y datos?', confirmBtn: 'Sí, eliminar',
      deleting: 'Eliminando…', done: '✅ Tu cuenta y tus datos han sido eliminados.',
      failed: 'No se pudo completar la eliminación. Inténtalo de nuevo.',
      needOnline: 'Necesitas conexión a internet para eliminar la cuenta y los datos.'
    },
    offline: {
      banner: '📡 Sin conexión. Puedes seguir trabajando; los cambios se sincronizarán al recuperar la red.',
      loadError: '⚠️ No se pudieron cargar los datos del servidor. Revisa tu conexión o tus permisos.',
      writeFailed: 'No se pudo guardar el cambio. Inténtalo de nuevo.',
      loading: 'Cargando…'
    },
    staffForm: {
      position: 'Puesto', positionPH: 'Ej: Camarera de pisos',
      start: 'Fecha de inicio', end: 'Fecha de término', datePH: 'AAAA-MM-DD',
      pin: 'PIN de acceso (4 dígitos)', pinPH: '••••',
      invalidDate: 'Fecha no válida. Usa el formato AAAA-MM-DD.',
      invalidRange: 'La fecha de término no puede ser anterior a la de inicio.',
      invalidPin: 'El PIN debe tener exactamente 4 dígitos.',
      edit: '✏️ Editar empleado', update: 'Guardar cambios', cancelEdit: 'Cancelar edición',
      period: 'Contrato', ended: 'Contrato finalizado', openEnded: 'indefinido',
      delTitle: 'Eliminar empleado', delMsg: '¿Eliminar a {name}? Perderá el acceso a la aplicación.', delOk: 'Eliminar',
      saved: '✅ Empleado guardado.',
      hint: 'ℹ️ Cómo darlo de alta: escribe nombre y puesto, elige el rol (departamento), indica las fechas del contrato y un PIN de 4 dígitos. El empleado entrará eligiendo su nombre e introduciendo ese PIN.'
    },
    login: {
      enterPin: 'Introduce un PIN de 4 dígitos.', wrongPin: 'PIN incorrecto.', wrongCreds: 'Usuario o PIN incorrectos.',
      pinFor: 'Introduce el PIN de', firstSetup: 'Primer acceso: el usuario y el PIN que introduzcas quedarán registrados.',
      receptionUser: 'Usuario: recepcion', created: '✅ Credenciales creadas.',
      offlineLogin: 'No se pudo verificar el acceso. Comprueba tu conexión a internet.',
      noPin: 'Este empleado aún no tiene PIN. Pide a la dirección que lo configure.'
    }
  },
  en: {
    feed: { tabSettings: '⚙️ Settings' },
    terms: {
      title: 'Terms and Privacy Policy',
      intro: 'To use Atrium Management you must accept the Terms of Service and the Privacy Policy.',
      accept: 'Accept and continue', decline: 'Decline',
      declinedTitle: 'Access not allowed',
      declinedBody: 'You cannot use the app without accepting the terms. You can review them again at any time.',
      review: 'Review again'
    },
    privacy: {
      title: 'Privacy Policy',
      clauses: [
        '1. Data we process: name, position, contract dates, access PIN and the hotel’s operational data (tasks, reports, rooms).',
        '2. Purpose: managing hotel operations. We do not sell or share your data with third parties for advertising.',
        '3. Storage: data is stored in Google Firebase services (Firestore). You can keep using the app offline; changes sync when the network returns.',
        '4. Your rights: you can access and correct your data through management and delete your account and data in Settings → Delete account and data.',
        '5. Contact: for any privacy question use the technical support listed under Help & Support.'
      ],
      close: 'Close'
    },
    footer: { privacy: '🔒 Privacy' },
    settings: {
      title: '⚙️ Settings and profile', profile: 'My profile', user: 'User', roleLabel: 'Role',
      legal: 'Legal information', terms: '⚖️ Terms of Service', privacy: '🔒 Privacy Policy', help: '❓ Help & Support',
      danger: 'Danger zone'
    },
    account: {
      deleteBtn: '🗑️ Delete account and data',
      deleteInfoStaff: 'Your employee record, your PIN and the tasks assigned to you will be deleted. This cannot be undone.',
      deleteInfoDirection: 'ALL hotel data in the cloud will be deleted: team, tasks, reports and the management and reception credentials. This cannot be undone.',
      deleteInfoReception: 'The reception PIN and the local data on this device will be deleted. Management can create a new one.',
      confirmTitle: 'Delete account and data?', confirmBtn: 'Yes, delete',
      deleting: 'Deleting…', done: '✅ Your account and data have been deleted.',
      failed: 'The deletion could not be completed. Please try again.',
      needOnline: 'You need an internet connection to delete the account and data.'
    },
    offline: {
      banner: '📡 No connection. You can keep working; changes will sync when the network returns.',
      loadError: '⚠️ Could not load data from the server. Check your connection or permissions.',
      writeFailed: 'The change could not be saved. Please try again.',
      loading: 'Loading…'
    },
    staffForm: {
      position: 'Position', positionPH: 'E.g.: Room attendant',
      start: 'Start date', end: 'End date', datePH: 'YYYY-MM-DD',
      pin: 'Access PIN (4 digits)', pinPH: '••••',
      invalidDate: 'Invalid date. Use the format YYYY-MM-DD.',
      invalidRange: 'The end date cannot be earlier than the start date.',
      invalidPin: 'The PIN must be exactly 4 digits.',
      edit: '✏️ Edit employee', update: 'Save changes', cancelEdit: 'Cancel editing',
      period: 'Contract', ended: 'Contract ended', openEnded: 'open-ended',
      delTitle: 'Delete employee', delMsg: 'Delete {name}? They will lose access to the app.', delOk: 'Delete',
      saved: '✅ Employee saved.',
      hint: 'ℹ️ How to register: enter name and position, choose the role (department), set the contract dates and a 4-digit PIN. The employee signs in by choosing their name and entering that PIN.'
    },
    login: {
      enterPin: 'Enter a 4-digit PIN.', wrongPin: 'Wrong PIN.', wrongCreds: 'Wrong username or PIN.',
      pinFor: 'Enter the PIN for', firstSetup: 'First access: the username and PIN you enter will be saved.',
      receptionUser: 'User: recepcion', created: '✅ Credentials created.',
      offlineLogin: 'Access could not be verified. Check your internet connection.',
      noPin: 'This employee has no PIN yet. Ask management to set one.'
    }
  },
  fr: {
    feed: { tabSettings: '⚙️ Réglages' },
    terms: {
      title: 'Conditions et politique de confidentialité',
      intro: 'Pour utiliser Atrium Management, vous devez accepter les Conditions d’utilisation et la Politique de confidentialité.',
      accept: 'Accepter et continuer', decline: 'Refuser',
      declinedTitle: 'Accès non autorisé',
      declinedBody: 'Sans accepter les conditions, vous ne pouvez pas utiliser l’application. Vous pouvez les relire à tout moment.',
      review: 'Relire'
    },
    privacy: {
      title: 'Politique de confidentialité',
      clauses: [
        '1. Données traitées : nom, poste, dates de contrat, PIN d’accès et données opérationnelles de l’hôtel (tâches, rapports, chambres).',
        '2. Finalité : gérer l’exploitation de l’hôtel. Nous ne vendons ni ne transmettons vos données à des tiers à des fins publicitaires.',
        '3. Stockage : les données sont hébergées par Google Firebase (Firestore). Vous pouvez continuer à utiliser l’application hors ligne ; les modifications se synchronisent au retour du réseau.',
        '4. Vos droits : vous pouvez consulter et rectifier vos données auprès de la direction et supprimer votre compte et vos données dans Réglages → Supprimer le compte et les données.',
        '5. Contact : pour toute question de confidentialité, utilisez le support technique indiqué dans Aide et support.'
      ],
      close: 'Fermer'
    },
    footer: { privacy: '🔒 Confidentialité' },
    settings: {
      title: '⚙️ Réglages et profil', profile: 'Mon profil', user: 'Utilisateur', roleLabel: 'Rôle',
      legal: 'Informations légales', terms: '⚖️ Conditions d’utilisation', privacy: '🔒 Politique de confidentialité', help: '❓ Aide et support',
      danger: 'Zone de danger'
    },
    account: {
      deleteBtn: '🗑️ Supprimer le compte et les données',
      deleteInfoStaff: 'Votre fiche employé, votre PIN et les tâches qui vous sont assignées seront supprimés. Cette action est irréversible.',
      deleteInfoDirection: 'TOUTES les données de l’hôtel dans le cloud seront supprimées : équipe, tâches, rapports et identifiants de la direction et de la réception. Cette action est irréversible.',
      deleteInfoReception: 'Le PIN de la réception et les données locales de cet appareil seront supprimés. La direction pourra en créer un nouveau.',
      confirmTitle: 'Supprimer le compte et les données ?', confirmBtn: 'Oui, supprimer',
      deleting: 'Suppression…', done: '✅ Votre compte et vos données ont été supprimés.',
      failed: 'La suppression n’a pas pu aboutir. Réessayez.',
      needOnline: 'Une connexion internet est nécessaire pour supprimer le compte et les données.'
    },
    offline: {
      banner: '📡 Pas de connexion. Vous pouvez continuer à travailler ; les modifications seront synchronisées au retour du réseau.',
      loadError: '⚠️ Impossible de charger les données du serveur. Vérifiez votre connexion ou vos autorisations.',
      writeFailed: 'La modification n’a pas pu être enregistrée. Réessayez.',
      loading: 'Chargement…'
    },
    staffForm: {
      position: 'Poste', positionPH: 'Ex : Femme de chambre',
      start: 'Date de début', end: 'Date de fin', datePH: 'AAAA-MM-JJ',
      pin: 'PIN d’accès (4 chiffres)', pinPH: '••••',
      invalidDate: 'Date invalide. Utilisez le format AAAA-MM-JJ.',
      invalidRange: 'La date de fin ne peut pas précéder la date de début.',
      invalidPin: 'Le PIN doit comporter exactement 4 chiffres.',
      edit: '✏️ Modifier l’employé', update: 'Enregistrer les modifications', cancelEdit: 'Annuler la modification',
      period: 'Contrat', ended: 'Contrat terminé', openEnded: 'indéterminé',
      delTitle: 'Supprimer l’employé', delMsg: 'Supprimer {name} ? Il perdra l’accès à l’application.', delOk: 'Supprimer',
      saved: '✅ Employé enregistré.',
      hint: 'ℹ️ Comment l’enregistrer : saisissez le nom et le poste, choisissez le rôle (service), indiquez les dates du contrat et un PIN à 4 chiffres. L’employé se connecte en choisissant son nom et en saisissant ce PIN.'
    },
    login: {
      enterPin: 'Saisissez un PIN à 4 chiffres.', wrongPin: 'PIN incorrect.', wrongCreds: 'Utilisateur ou PIN incorrect.',
      pinFor: 'Saisissez le PIN de', firstSetup: 'Première connexion : l’utilisateur et le PIN saisis seront enregistrés.',
      receptionUser: 'Utilisateur : recepcion', created: '✅ Identifiants créés.',
      offlineLogin: 'Impossible de vérifier l’accès. Vérifiez votre connexion internet.',
      noPin: 'Cet employé n’a pas encore de PIN. Demandez à la direction d’en définir un.'
    }
  }
};

const isPlainObject = (v: any) => v && typeof v === 'object' && !Array.isArray(v);
const deepMerge = (base: any, over: any): any => {
  if (!isPlainObject(base) || !isPlainObject(over)) return over === undefined ? base : over;
  const out: any = { ...base };
  Object.keys(over).forEach(k => { out[k] = deepMerge(base[k], over[k]); });
  return out;
};
// ES (base) → idioma elegido; las claves que falten caen en ES
const buildT = (lang: string): any => {
  const es = deepMerge(deepMerge(translations.es, extraTranslations.es), extraTranslations2.es);
  const sel = deepMerge(
    deepMerge(translations[lang] || {}, extraTranslations[lang] || {}),
    extraTranslations2[lang] || {}
  );
  return deepMerge(es, sel);
};

/* ============================================================
   CONSTANTES Y DATOS INICIALES
   ============================================================ */
const HOTEL_STORAGE_KEY = '@hotel_app_data_riviera';
const LANG_KEY = '@hotel_app_lang';
const TERMS_KEY = '@hotel_app_terms_accepted_v1';
const CACHE_PREFIX = '@hotel_cache_';

const rolesList = [
  { id: 'direction', color: '#1E293B', icon: '🏨' },
  { id: 'reception', color: '#0066CC', icon: '🖥️' },
  { id: 'governess', color: '#5b21b6', icon: '📋' },
  { id: 'cleaning', color: '#047857', icon: '🧽' },
  { id: 'equipier', color: '#b45309', icon: '🧺' },
  { id: 'maintenance', color: '#D97706', icon: '🔧' },
];

// Perfiles que entran eligiendo su nombre de la lista dada de alta por la dirección
const STAFF_ROLES = ['governess', 'maintenance', 'cleaning', 'equipier'];
// Departamentos a los que la gobernante puede asignar tareas
const TASK_ROLES = ['cleaning', 'equipier', 'maintenance'];

const STATUS_KEYS = ['checkout', 'cleaning', 'ready', 'occupied', 'daily', 'blocked'];
const STATUS_COLORS: Record<string, string> = {
  checkout: '#10B981',
  cleaning: '#FACC15',
  ready: '#0EA5E9',
  occupied: '#EF4444',
  daily: '#E5E7EB',
  blocked: '#111827',
};
const SECTION_GROUPS = [
  { key: 'secPriority', statuses: ['checkout', 'cleaning', 'blocked'] },
  { key: 'secStay', statuses: ['occupied', 'daily'] },
  { key: 'secAvail', statuses: ['ready'] },
];
// En la pestaña de Dirección se invierten verde y rojo (ocupada = verde)
const statusColor = (status: string, swap: boolean) => {
  if (swap && status === 'checkout') return STATUS_COLORS.occupied;
  if (swap && status === 'occupied') return STATUS_COLORS.checkout;
  return STATUS_COLORS[status];
};

const WORK_KEYS = ['not_started', 'in_progress', 'done'];
const WORK_COLORS: Record<string, string> = { not_started: '#64748B', in_progress: '#F59E0B', done: '#10B981' };

const FLOORS = [
  { f: '-1', ids: ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08'] },
  { f: '0', ids: ['001', '002', '003', '004', '005', '006', '007', '008', '009'] },
  { f: '1', ids: ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110'] },
  { f: '2', ids: ['201', '202', '203', '204', '205', '206', '207', '208', '209', '210'] },
  { f: '3', ids: ['301', '302', '303', '304', '305'] },
];
const ALL_ROOM_IDS = FLOORS.flatMap(f => f.ids);
const TASK_TYPE_COLORS: Record<string, string> = { inOut: '#EF4444', daily: '#0284C7', out: '#10B981' };

// category: 'towels' | 'sheets' | 'supplies'. "key" enlaza con la traducción; si la gobernante cambia el nombre se guarda en "name".
// El catálogo vive en Firestore (config/catalog); esto es solo el valor inicial.
const DEFAULT_CATALOG = [
  { id: 'largeTowels', key: 'largeTowels', category: 'towels', qty: 2 },
  { id: 'mediumTowels', key: 'mediumTowels', category: 'towels', qty: 2 },
  { id: 'faceTowels', key: 'faceTowels', category: 'towels', qty: 2 },
  { id: 'bathMat', key: 'bathMat', category: 'towels', qty: 1 },
  { id: 'bathrobe', key: 'bathrobe', category: 'towels', qty: 0 },
  { id: 'blackSheet2xl', key: 'blackSheet2xl', category: 'sheets', qty: 0 },
  { id: 'blackSheetL', key: 'blackSheetL', category: 'sheets', qty: 0 },
  { id: 'greenSheetL', key: 'greenSheetL', category: 'sheets', qty: 0 },
  { id: 'yellowDuvet', key: 'yellowDuvet', category: 'sheets', qty: 0 },
  { id: 'redDuvet', key: 'redDuvet', category: 'sheets', qty: 0 },
  { id: 'orangeDuvet', key: 'orangeDuvet', category: 'sheets', qty: 0 },
  { id: 'pillowcases', key: 'pillowcases', category: 'sheets', qty: 4 },
  { id: 'toiletPaper', key: 'toiletPaper', category: 'supplies', qty: 0 },
  { id: 'paperTowel', key: 'paperTowel', category: 'supplies', qty: 0 },
  { id: 'pens', key: 'pens', category: 'supplies', qty: 0 },
  { id: 'water', key: 'water', category: 'supplies', qty: 0 },
  { id: 'coffeePods', key: 'coffeePods', category: 'supplies', qty: 0 },
  { id: 'soap', key: 'soap', category: 'supplies', qty: 0 },
  { id: 'shampoo', key: 'shampoo', category: 'supplies', qty: 0 },
  { id: 'bodyGel', key: 'bodyGel', category: 'supplies', qty: 0 },
];
const CATALOG_CATEGORIES = ['towels', 'sheets', 'supplies'] as const;

/* ============================================================
   UTILIDADES
   ============================================================ */
const notify = (msg: string) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(msg);
  else Alert.alert('', msg);
};
const uid = (p: string) => p + '_' + Date.now() + Math.floor(Math.random() * 1000);
const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Suma las franjas "HH:MM-HH:MM" que haya en el texto del horario (acepta varias, p. ej. turno partido)
const hoursFromText = (txt: string) => {
  let total = 0;
  const re = /(\d{1,2})[:h](\d{2})\s*[-–—]\s*(\d{1,2})[:h](\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(txt)) !== null) {
    const start = Number(m[1]) * 60 + Number(m[2]);
    let end = Number(m[3]) * 60 + Number(m[4]);
    if (end <= start) end += 1440;
    total += (end - start) / 60;
  }
  return Math.round(total * 10) / 10;
};

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
const isValidPhone = (s: string) => /^\+?\d{7,15}$/.test(s.replace(/[\s().-]/g, ''));
const isValidContact = (s: string) => isValidEmail(s) || isValidPhone(s);
const normContact = (s: string) => (s.includes('@') ? s.trim().toLowerCase() : s.replace(/[^\d+]/g, ''));
const parseRooms = (txt: string) => txt.split(/[\s,.;/]+/).map(x => x.trim().toUpperCase()).filter(Boolean);

const isValidDateStr = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !isNaN(d.getTime()) && dateKey(d) === s;
};

const getWeeks = (year: number, month: number) => {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // semana empieza en lunes
  const last = new Date(year, month + 1, 0);
  const weeks: Date[][] = [];
  let start = new Date(year, month, 1 - offset);
  while (start <= last) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) week.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    weeks.push(week);
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  }
  return weeks;
};
const findWeekIndex = (date: Date) => {
  const weeks = getWeeks(date.getFullYear(), date.getMonth());
  const key = dateKey(date);
  const idx = weeks.findIndex(w => w.some(d => dateKey(d) === key));
  return idx >= 0 ? idx : 0;
};

/* ============================================================
   HOOK: colección de Firestore en tiempo real (onSnapshot)
   - Refleja al instante las escrituras locales (latency compensation).
   - Guarda una copia en AsyncStorage para poder arrancar sin red.
   - Expone fromCache / error para mostrar el estado offline.
   ============================================================ */
function useFirestoreCollection<T extends { id: string }>(name: string) {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let gotSnapshot = false;

    AsyncStorage.getItem(CACHE_PREFIX + name)
      .then(raw => {
        if (cancelled || gotSnapshot || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) { setItems(parsed as T[]); setReady(true); }
        } catch { /* caché corrupta: se ignora */ }
      })
      .catch(() => {});

    const unsubscribe = onSnapshot(
      collection(db, name),
      { includeMetadataChanges: true },
      snapshot => {
        gotSnapshot = true;
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
        setItems(list);
        setFromCache(snapshot.metadata.fromCache);
        setError(null);
        setReady(true);
        if (!snapshot.metadata.fromCache) {
          AsyncStorage.setItem(CACHE_PREFIX + name, JSON.stringify(list)).catch(() => {});
        }
      },
      err => {
        console.error(`Error escuchando "${name}":`, err);
        setError((err as any)?.code || 'error');
        setReady(true);
      }
    );

    return () => { cancelled = true; unsubscribe(); };
  }, [name]);

  return { items, ready, fromCache, error };
}

/* Hook: un único documento de Firestore en tiempo real (p. ej. config/catalog) */
function useFirestoreDoc<T>(col: string, id: string) {
  const [data, setData] = useState<T | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, col, id),
      snap => { setData(snap.exists() ? (snap.data() as T) : null); setReady(true); },
      err => { console.error(`Error escuchando "${col}/${id}":`, err); setReady(true); }
    );
    return unsubscribe;
  }, [col, id]);
  return { data, ready };
}

/* ============================================================
   COMPONENTES PEQUEÑOS
   ============================================================ */
function RoomCircle({ id, status, color, onPress }: any) {
  const darkText = status === 'daily' || status === 'cleaning';
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[styles.roomCircle, { backgroundColor: color, borderColor: status === 'daily' ? '#94A3B8' : color }]}
    >
      <Text style={[styles.roomCircleText, { color: darkText ? '#1E293B' : '#FFFFFF' }]}>{id}</Text>
    </TouchableOpacity>
  );
}

function PlusButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.plusBtn} onPress={onPress}>
      <Text style={styles.plusBtnText}>+</Text>
    </TouchableOpacity>
  );
}

/* ============================================================
   TEXTOS NUEVOS (segunda tanda): asignación, notas, faltantes,
   conteo, restablecer PIN y horarios escritos. ES · EN · FR.
   ============================================================ */
const extraTranslations2: Record<string, any> = {
  es: {
    feed: { tabAssign: '🧹 Asignación' },
    items: {
      toiletPaper: 'Papel higiénico', paperTowel: 'Papel toalla', pens: 'Bolígrafos', water: 'Agua (botellas)',
      coffeePods: 'Cápsulas de café', soap: 'Jabón', shampoo: 'Champú', bodyGel: 'Gel de ducha'
    },
    cleaning: { supplies: 'Utensilios y suministros' },
    assign: {
      title: '🧹 Planning de limpieza del día',
      sub: 'Asigna las habitaciones a cada trabajador. Aparecerán directamente en su pantalla.',
      howto: 'ℹ️ Cómo asignar: 1) elige el día, 2) elige al trabajador, 3) escribe los números de habitación en cada tipo de servicio (separados por coma, punto o espacio) y 4) pulsa «Asignar habitaciones». Todas empiezan como «Aún no hecho».',
      today: 'Hoy', worker: 'Trabajador', daily: 'Limpieza diaria', out: 'Salidas', inOut: 'Salidas y entradas',
      roomsPH: 'Ej: 201, 202, 203', add: 'Asignar habitaciones', invalidRooms: 'Habitaciones no válidas: ',
      nothing: 'Escribe al menos una habitación.', noWorkers: 'Primero da de alta personal de limpieza en la pestaña Equipo.',
      saved: '✅ Habitaciones asignadas.', listTitle: 'Habitaciones asignadas', empty: 'No hay habitaciones asignadas para este día.',
      guestPH: 'Nombre del cliente'
    },
    cleaningView: {
      moreInfo: 'ℹ️ Más información', infoTitle: 'Información de la habitación',
      noAssignments: 'Aún no tienes habitaciones asignadas hoy. La gobernante o la recepción las asignarán desde su planning.',
      linenDetail: 'Toallas, sábanas y fundas', noLinenInfo: 'Sin registros todavía.',
      addNote: '📝 Agregar nota para la gobernante', notePH: 'Ej: Cortina rota, falta una almohada…',
      sendNote: 'Enviar nota', noteSent: '📝 Nota enviada a la gobernante.', noteEmpty: 'Escribe la nota antes de enviarla.',
      notes: 'Notas', noNotes: 'Sin notas.', service: 'Servicio', close: 'Cerrar'
    },
    supply: {
      title: '📦 Faltantes por planta', sub: 'Avisa a la gobernante de lo que falta en cada planta; ella te creará la tarea.',
      add: 'Avisar a la gobernante', floor: 'Planta', textPH: 'Ej: Faltan toallas y papel higiénico',
      sent: '📨 Aviso enviado a la gobernante.', open: 'Pendiente', assigned: 'Tarea creada', done: 'Hecho',
      createTask: 'Crear tarea', requestsTitle: '📦 Faltantes avisados por el equipier', empty: 'Sin avisos.',
      mine: 'Mis avisos', textEmpty: 'Describe qué falta.', taskPrefix: 'Planta'
    },
    count: {
      title: '🧮 Conteo del día', sub: 'Anota con + y − lo utilizado hoy (sábanas, toallas, fundas y utensilios). Se guarda por fecha.',
      print: '🖨️ Imprimir hoja del día', sheetTitle: 'Hoja de conteo diario', printedAt: 'Impreso el', by: 'Por',
      qty: 'Cantidad', article: 'Artículo', total: 'Total', none: 'Sin artículos contados',
      printFailed: 'No se pudo abrir la impresión.', date: 'Fecha', readOnly: 'Conteo registrado por el equipier hoy'
    },
    pinReset: {
      title: 'Restablecer PIN', forgot: '¿Olvidaste tu PIN?', contact: 'Correo electrónico o teléfono',
      contactPH: 'correo@ejemplo.com o +33…', newPin: 'Nuevo PIN (4 dígitos)', confirm: 'Restablecer',
      done: '✅ PIN actualizado. Ya puedes acceder con el nuevo PIN.',
      mismatch: 'El correo o teléfono no coincide con el registrado.',
      noContact: 'No hay un correo o teléfono registrado. Pide a la dirección que restablezca tu PIN.',
      forStaff: 'PIN nuevo para', receptionTitle: 'PIN de recepción',
      needContact: 'Primer acceso: introduce también un correo electrónico o un teléfono para poder restablecer el PIN más adelante.',
      invalidContact: 'Correo o teléfono no válido.',
      directionContactLabel: 'Correo o teléfono de la dirección',
      forgotInfo: 'Verificamos el correo o teléfono registrado y defines un PIN nuevo.'
    },
    planningEdit: {
      title: 'Editar horario', label: 'Horario', ph: 'Ej: 07:00-15:30', clear: 'Borrar',
      hint: 'Escribe el horario como quieras. Si usas franjas HH:MM-HH:MM las horas se suman automáticamente.',
      tapHint: 'Toca una casilla para escribir el horario de ese día.'
    },
    dashboard: {
      inspectionEmpty: 'No hay habitaciones planificadas hoy. Asígnalas en la pestaña Asignación.',
      assignedTo: 'Asignada a', notesLabel: 'Notas'
    },
    settings: {
      credentials: 'Credenciales de acceso', receptionPin: '🔑 Establecer / restablecer PIN de recepción',
      info: 'Ningún PIN se guarda en este dispositivo.'
    },
    staffForm: {
      contact: 'Correo o teléfono (para restablecer el PIN)', contactPH: 'correo@ejemplo.com o +33…',
      resetPin: 'Restablecer PIN', invalidContact: 'Correo o teléfono no válido.'
    }
  },

  en: {
    feed: { tabAssign: '🧹 Assignments' },
    items: {
      toiletPaper: 'Toilet paper', paperTowel: 'Paper towels', pens: 'Pens', water: 'Water (bottles)',
      coffeePods: 'Coffee pods', soap: 'Soap', shampoo: 'Shampoo', bodyGel: 'Shower gel'
    },
    cleaning: { supplies: 'Supplies and utensils' },
    assign: {
      title: '🧹 Daily cleaning plan',
      sub: 'Assign rooms to each worker. They appear directly on the worker’s screen.',
      howto: 'ℹ️ How to assign: 1) pick the day, 2) pick the worker, 3) type the room numbers under each service type (separated by comma, dot or space) and 4) tap “Assign rooms”. All rooms start as “Not done yet”.',
      today: 'Today', worker: 'Worker', daily: 'Daily cleaning', out: 'Check-outs', inOut: 'Check-outs and check-ins',
      roomsPH: 'E.g.: 201, 202, 203', add: 'Assign rooms', invalidRooms: 'Invalid rooms: ',
      nothing: 'Enter at least one room.', noWorkers: 'First register housekeeping staff in the Team tab.',
      saved: '✅ Rooms assigned.', listTitle: 'Assigned rooms', empty: 'No rooms assigned for this day.',
      guestPH: 'Guest name'
    },
    cleaningView: {
      moreInfo: 'ℹ️ More information', infoTitle: 'Room information',
      noAssignments: 'You have no rooms assigned today yet. The head housekeeper or reception will assign them from their planning.',
      linenDetail: 'Towels, sheets and covers', noLinenInfo: 'No records yet.',
      addNote: '📝 Add a note for the head housekeeper', notePH: 'E.g.: Broken curtain, missing pillow…',
      sendNote: 'Send note', noteSent: '📝 Note sent to the head housekeeper.', noteEmpty: 'Write the note before sending it.',
      notes: 'Notes', noNotes: 'No notes.', service: 'Service', close: 'Close'
    },
    supply: {
      title: '📦 Missing items per floor', sub: 'Tell the head housekeeper what is missing on each floor; she will create the task for you.',
      add: 'Notify the head housekeeper', floor: 'Floor', textPH: 'E.g.: Towels and toilet paper are missing',
      sent: '📨 Notice sent to the head housekeeper.', open: 'Pending', assigned: 'Task created', done: 'Done',
      createTask: 'Create task', requestsTitle: '📦 Missing items reported by the floor assistant', empty: 'No notices.',
      mine: 'My notices', textEmpty: 'Describe what is missing.', taskPrefix: 'Floor'
    },
    count: {
      title: '🧮 Daily count', sub: 'Use + and − to log what was used today (sheets, towels, covers and supplies). Saved by date.',
      print: '🖨️ Print today’s sheet', sheetTitle: 'Daily count sheet', printedAt: 'Printed on', by: 'By',
      qty: 'Quantity', article: 'Item', total: 'Total', none: 'No items counted',
      printFailed: 'Printing could not be opened.', date: 'Date', readOnly: 'Count logged by the floor assistant today'
    },
    pinReset: {
      title: 'Reset PIN', forgot: 'Forgot your PIN?', contact: 'Email or phone number',
      contactPH: 'email@example.com or +33…', newPin: 'New PIN (4 digits)', confirm: 'Reset',
      done: '✅ PIN updated. You can now sign in with the new PIN.',
      mismatch: 'The email or phone does not match the one on record.',
      noContact: 'No email or phone is on record. Ask management to reset your PIN.',
      forStaff: 'New PIN for', receptionTitle: 'Reception PIN',
      needContact: 'First access: also enter an email or phone number so the PIN can be reset later.',
      invalidContact: 'Invalid email or phone number.',
      directionContactLabel: 'Management email or phone',
      forgotInfo: 'We check the registered email or phone and you set a new PIN.'
    },
    planningEdit: {
      title: 'Edit schedule', label: 'Schedule', ph: 'E.g.: 07:00-15:30', clear: 'Clear',
      hint: 'Write the schedule any way you like. If you use HH:MM-HH:MM ranges the hours are added up automatically.',
      tapHint: 'Tap a cell to write that day’s schedule.'
    },
    dashboard: {
      inspectionEmpty: 'No rooms planned today. Assign them in the Assignments tab.',
      assignedTo: 'Assigned to', notesLabel: 'Notes'
    },
    settings: {
      credentials: 'Access credentials', receptionPin: '🔑 Set / reset reception PIN',
      info: 'No PIN is stored on this device.'
    },
    staffForm: {
      contact: 'Email or phone (to reset the PIN)', contactPH: 'email@example.com or +33…',
      resetPin: 'Reset PIN', invalidContact: 'Invalid email or phone number.'
    }
  },

  fr: {
    feed: { tabAssign: '🧹 Affectations' },
    items: {
      toiletPaper: 'Papier toilette', paperTowel: 'Essuie-tout', pens: 'Stylos', water: 'Eau (bouteilles)',
      coffeePods: 'Capsules de café', soap: 'Savon', shampoo: 'Shampooing', bodyGel: 'Gel douche'
    },
    cleaning: { supplies: 'Ustensiles et fournitures' },
    assign: {
      title: '🧹 Planning de nettoyage du jour',
      sub: 'Affectez les chambres à chaque agent. Elles apparaissent directement sur son écran.',
      howto: 'ℹ️ Comment affecter : 1) choisissez le jour, 2) choisissez l’agent, 3) saisissez les numéros de chambre pour chaque type de service (séparés par une virgule, un point ou un espace) et 4) appuyez sur « Affecter les chambres ». Toutes commencent à « Pas encore fait ».',
      today: 'Aujourd’hui', worker: 'Agent', daily: 'Recouche', out: 'Départs', inOut: 'Départs et arrivées',
      roomsPH: 'Ex : 201, 202, 203', add: 'Affecter les chambres', invalidRooms: 'Chambres non valides : ',
      nothing: 'Saisissez au moins une chambre.', noWorkers: 'Enregistrez d’abord du personnel de nettoyage dans l’onglet Équipe.',
      saved: '✅ Chambres affectées.', listTitle: 'Chambres affectées', empty: 'Aucune chambre affectée pour ce jour.',
      guestPH: 'Nom du client'
    },
    cleaningView: {
      moreInfo: 'ℹ️ Plus d’informations', infoTitle: 'Informations sur la chambre',
      noAssignments: 'Aucune chambre ne vous est encore affectée aujourd’hui. La gouvernante ou la réception les affecteront depuis leur planning.',
      linenDetail: 'Serviettes, draps et housses', noLinenInfo: 'Aucun enregistrement pour le moment.',
      addNote: '📝 Ajouter une note pour la gouvernante', notePH: 'Ex : Rideau cassé, oreiller manquant…',
      sendNote: 'Envoyer la note', noteSent: '📝 Note envoyée à la gouvernante.', noteEmpty: 'Écrivez la note avant de l’envoyer.',
      notes: 'Notes', noNotes: 'Aucune note.', service: 'Service', close: 'Fermer'
    },
    supply: {
      title: '📦 Manques par étage', sub: 'Signalez à la gouvernante ce qui manque à chaque étage ; elle vous créera la tâche.',
      add: 'Prévenir la gouvernante', floor: 'Étage', textPH: 'Ex : Il manque des serviettes et du papier toilette',
      sent: '📨 Signalement envoyé à la gouvernante.', open: 'En attente', assigned: 'Tâche créée', done: 'Fait',
      createTask: 'Créer la tâche', requestsTitle: '📦 Manques signalés par l’équipier', empty: 'Aucun signalement.',
      mine: 'Mes signalements', textEmpty: 'Décrivez ce qui manque.', taskPrefix: 'Étage'
    },
    count: {
      title: '🧮 Comptage du jour', sub: 'Notez avec + et − ce qui a été utilisé aujourd’hui (draps, serviettes, housses et ustensiles). Enregistré par date.',
      print: '🖨️ Imprimer la feuille du jour', sheetTitle: 'Feuille de comptage quotidien', printedAt: 'Imprimé le', by: 'Par',
      qty: 'Quantité', article: 'Article', total: 'Total', none: 'Aucun article compté',
      printFailed: 'Impossible d’ouvrir l’impression.', date: 'Date', readOnly: 'Comptage enregistré par l’équipier aujourd’hui'
    },
    pinReset: {
      title: 'Réinitialiser le PIN', forgot: 'PIN oublié ?', contact: 'E-mail ou numéro de téléphone',
      contactPH: 'email@exemple.com ou +33…', newPin: 'Nouveau PIN (4 chiffres)', confirm: 'Réinitialiser',
      done: '✅ PIN mis à jour. Vous pouvez vous connecter avec le nouveau PIN.',
      mismatch: 'L’e-mail ou le téléphone ne correspond pas à celui enregistré.',
      noContact: 'Aucun e-mail ni téléphone enregistré. Demandez à la direction de réinitialiser votre PIN.',
      forStaff: 'Nouveau PIN pour', receptionTitle: 'PIN de la réception',
      needContact: 'Première connexion : saisissez aussi un e-mail ou un téléphone pour pouvoir réinitialiser le PIN plus tard.',
      invalidContact: 'E-mail ou téléphone non valide.',
      directionContactLabel: 'E-mail ou téléphone de la direction',
      forgotInfo: 'Nous vérifions l’e-mail ou le téléphone enregistré et vous définissez un nouveau PIN.'
    },
    planningEdit: {
      title: 'Modifier l’horaire', label: 'Horaire', ph: 'Ex : 07:00-15:30', clear: 'Effacer',
      hint: 'Écrivez l’horaire comme vous voulez. Avec des plages HH:MM-HH:MM, les heures sont additionnées automatiquement.',
      tapHint: 'Touchez une case pour écrire l’horaire de ce jour.'
    },
    dashboard: {
      inspectionEmpty: 'Aucune chambre planifiée aujourd’hui. Affectez-les dans l’onglet Affectations.',
      assignedTo: 'Affectée à', notesLabel: 'Notes'
    },
    settings: {
      credentials: 'Identifiants d’accès', receptionPin: '🔑 Définir / réinitialiser le PIN de la réception',
      info: 'Aucun PIN n’est enregistré sur cet appareil.'
    },
    staffForm: {
      contact: 'E-mail ou téléphone (pour réinitialiser le PIN)', contactPH: 'email@exemple.com ou +33…',
      resetPin: 'Réinitialiser le PIN', invalidContact: 'E-mail ou téléphone non valide.'
    }
  }
};

/* ============================================================
   PANTALLA PRINCIPAL
   ============================================================ */
export default function HomeScreen() {
  /* ---------- Idioma ---------- */
  const [currentLang, setCurrentLang] = useState('es');

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(LANG_KEY)
        .then(savedLang => {
          if (savedLang && translations[savedLang]) setCurrentLang(savedLang);
        })
        .catch(() => {});
    }, [])
  );

  const changeLanguage = useCallback(async (langCode: string) => {
    setCurrentLang(langCode);
    try { await AsyncStorage.setItem(LANG_KEY, langCode); }
    catch (error) { console.error('Error al guardar idioma:', error); }
  }, []);

  const t = useMemo(() => buildT(currentLang), [currentLang]);

  /* ---------- Términos y condiciones (primer arranque) ---------- */
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [termsDeclined, setTermsDeclined] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TERMS_KEY)
      .then(v => setTermsAccepted(v === '1'))
      .catch(() => setTermsAccepted(false));
  }, []);

  const acceptTerms = async () => {
    try { await AsyncStorage.setItem(TERMS_KEY, '1'); } catch (e) { console.error(e); }
    setTermsAccepted(true);
    setTermsDeclined(false);
  };

  /* ---------- Datos en Firestore (tiempo real) ---------- */
  const staffCol = useFirestoreCollection<StaffMember>('staff');
  const tasksCol = useFirestoreCollection<TaskItem>('tasks');
  const reportsCol = useFirestoreCollection<ReportItem>('reports');
  const scheduleCol = useFirestoreCollection<ScheduleEntry>('schedule');
  const assignmentsCol = useFirestoreCollection<Assignment>('assignments');
  const roomStatesCol = useFirestoreCollection<RoomState>('roomStates');
  const requestsCol = useFirestoreCollection<SupplyRequest>('supplyRequests');
  const countsCol = useFirestoreCollection<DailyCount>('dailyCounts');
  const catalogDoc = useFirestoreDoc<{ items: any[] }>('config', 'catalog');

  const todayKey = dateKey(new Date());

  const staff = useMemo(
    () => [...staffCol.items].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [staffCol.items]
  );
  const governessTasks = useMemo(
    () => [...tasksCol.items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [tasksCol.items]
  );
  const reports = useMemo(
    () => [...reportsCol.items].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [reportsCol.items]
  );
  const supplyRequests = useMemo(
    () => [...requestsCol.items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [requestsCol.items]
  );
  const schedule = useMemo(() => {
    const m: Record<string, string> = {};
    scheduleCol.items.forEach(e => { if (e.text) m[`${e.staffId}|${e.date}`] = e.text; });
    return m;
  }, [scheduleCol.items]);
  const assignments = useMemo(
    () => [...assignmentsCol.items].sort((a, b) => (a.room || '').localeCompare(b.room || '')),
    [assignmentsCol.items]
  );
  const todayAssignments = useMemo(() => assignments.filter(a => a.date === todayKey), [assignments, todayKey]);
  const catalog: any[] = catalogDoc.data?.items && catalogDoc.data.items.length ? catalogDoc.data.items : DEFAULT_CATALOG;
  const todayCounts: Record<string, number> = useMemo(
    () => countsCol.items.find(c => c.id === todayKey)?.counts || {},
    [countsCol.items, todayKey]
  );

  // Plano: el estado de cada habitación se guarda en Firestore (roomStates); por defecto "libre y limpia"
  const rooms = useMemo(() => {
    const map: Record<string, RoomState> = {};
    roomStatesCol.items.forEach(r => { map[r.id] = r; });
    return FLOORS.flatMap(({ f, ids }) =>
      ids.map(id => ({ id, floor: f, status: map[id]?.status || 'ready', prevStatus: map[id]?.prevStatus || null }))
    );
  }, [roomStatesCol.items]);

  // Estado de red: caché sin servidor o error de lectura
  const cols = [staffCol, tasksCol, reportsCol, scheduleCol, assignmentsCol, roomStatesCol, requestsCol, countsCol];
  const loadError = cols.find(c => c.error)?.error || null;
  const offlineRaw = !!loadError || (staffCol.ready && cols.some(c => c.fromCache));
  const [showOffline, setShowOffline] = useState(false);
  useEffect(() => {
    if (!offlineRaw) { setShowOffline(false); return; }
    const timer = setTimeout(() => setShowOffline(true), 2500); // evita parpadeos al arrancar
    return () => clearTimeout(timer);
  }, [offlineRaw]);
  const permissionIssue = !!loadError && loadError !== 'unavailable';

  /* ---------- Sesión (solo en memoria: nada de PIN guardado en el dispositivo) ---------- */
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [contact, setContact] = useState('');
  const [needsContact, setNeedsContact] = useState(false);
  const [pendingStaff, setPendingStaff] = useState<StaffMember | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Restablecer PIN
  const [pinReset, setPinReset] = useState<PinResetState | null>(null);
  const [resetContact, setResetContact] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  /* ---------- Estado de interfaz ---------- */
  const [activeViewMode, setActiveViewMode] = useState<string>('dashboard');
  const [mapMode, setMapMode] = useState<'general' | 'active'>('general');
  const [statusModalRoom, setStatusModalRoom] = useState<any>(null);
  const [openWorkMenu, setOpenWorkMenu] = useState<string | null>(null);

  // Tareas
  const [newTaskModalVisible, setNewTaskModalVisible] = useState(false);
  const [selectedTargetRole, setSelectedTargetRole] = useState('cleaning');
  const [selectedTargetStaff, setSelectedTargetStaff] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskRequestId, setNewTaskRequestId] = useState<string | null>(null);

  // Lencería (toallas / sábanas) y ficha de habitación (limpieza)
  const [linenModal, setLinenModal] = useState<{ item: Assignment; category: string } | null>(null);
  const [linenForm, setLinenForm] = useState<Record<string, number>>({});
  const [infoAssignmentId, setInfoAssignmentId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Faltantes por planta (equipier → gobernante)
  const [supplyModalVisible, setSupplyModalVisible] = useState(false);
  const [supplyFloor, setSupplyFloor] = useState('1');
  const [supplyText, setSupplyText] = useState('');

  // Mantenimiento
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [reportModalRoom, setReportModalRoom] = useState<string | null>(null);
  const [reportText, setReportText] = useState('');

  // Equipo / contratos
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('cleaning');
  const [newStaffPosition, setNewStaffPosition] = useState('');
  const [newStaffStart, setNewStaffStart] = useState('');
  const [newStaffEnd, setNewStaffEnd] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newStaffContact, setNewStaffContact] = useState('');

  // Asignación de habitaciones (gobernante / recepción)
  const [assignDayOffset, setAssignDayOffset] = useState(0);
  const [assignWorkerId, setAssignWorkerId] = useState<string | null>(null);
  const [roomsDaily, setRoomsDaily] = useState('');
  const [roomsOut, setRoomsOut] = useState('');
  const [roomsInOut, setRoomsInOut] = useState('');

  // Utensilios
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('towels');

  // Planning (horarios escritos)
  const today = new Date();
  const [planYear, setPlanYear] = useState(today.getFullYear());
  const [planMonth, setPlanMonth] = useState(today.getMonth());
  const [planWeek, setPlanWeek] = useState(() => findWeekIndex(today));
  const [shiftEdit, setShiftEdit] = useState<{ staffId: string; name: string; key: string; text: string } | null>(null);

  const getRole = () => session?.role || '';
  const isRoomBlocked = (roomNumber: string) => rooms.find(r => r.id === roomNumber)?.status === 'blocked';
  const itemName = (it: any) => it.name || t.items[it.key] || '';
  const workLabel = (w: string) => (w === 'done' ? t.dashboard.work.done : w === 'in_progress' ? t.dashboard.work.inCleaning : t.dashboard.work.notDone);
  const writeFailed = (e: unknown) => { console.error('Error de escritura en Firestore:', e); notify(t.offline.writeFailed); };

  /* ---------- Acceso ---------- */
  const loginAs = (name: string, role: string, staffId?: string) => {
    setSession({ username: name, role, staffId });
    setUsername(name);
    setPin('');
    setContact('');
    setNeedsContact(false);
    setPendingStaff(null);
    setActiveViewMode(role === 'reception' ? 'map' : 'dashboard');
  };

  const handleLogout = () => {
    setSession(null);
    setSelectedRole(null);
    setPendingStaff(null);
    setUsername('');
    setPin('');
    setContact('');
    setNeedsContact(false);
    setActiveViewMode('dashboard');
    setOpenWorkMenu(null);
  };

  // Empleados: eligen su nombre y verifican su PIN
  const handleStaffPin = () => {
    if (!pendingStaff || !selectedRole) return;
    const current = staff.find(x => x.id === pendingStaff.id) || pendingStaff; // por si el PIN se acaba de restablecer
    if (!current.pin) { notify(t.login.noPin); return; }
    if (pin !== current.pin) { notify(t.login.wrongPin); setPin(''); return; }
    loginAs(current.name, selectedRole, current.id);
  };

  // Dirección y recepción: credenciales en Firestore (config/access).
  // Primer acceso: lo que se introduce queda registrado (en dirección, junto con un correo o teléfono de recuperación).
  const handleLogin = async () => {
    if (!selectedRole) return;
    if (!/^\d{4}$/.test(pin)) { notify(t.login.enterPin); return; }
    const isDir = selectedRole === 'direction';
    const user = isDir ? username.trim() : 'recepcion';
    if (!user) { notify(t.alerts.nameRequired); return; }

    setLoginBusy(true);
    try {
      const ref = doc(db, 'config', 'access');
      const snap = await getDoc(ref);
      const cfg: any = snap.exists() ? snap.data() : {};

      if (isDir) {
        if (!cfg.directionPin) {
          const c = contact.trim();
          if (!c) { setNeedsContact(true); notify(t.pinReset.needContact); return; }
          if (!isValidContact(c)) { notify(t.pinReset.invalidContact); return; }
          setDoc(ref, { directionUser: user, directionPin: pin, directionContact: normContact(c) }, { merge: true }).catch(writeFailed);
          notify(t.login.created);
          loginAs(user, 'direction');
        } else if (String(cfg.directionUser || '').toLowerCase() === user.toLowerCase() && cfg.directionPin === pin) {
          loginAs(cfg.directionUser, 'direction');
        } else {
          notify(t.login.wrongCreds);
        }
      } else {
        if (!cfg.receptionPin) {
          setDoc(ref, { receptionPin: pin }, { merge: true }).catch(writeFailed);
          notify(t.login.created);
          loginAs(user, 'reception');
        } else if (cfg.receptionPin === pin) {
          loginAs(user, 'reception');
        } else {
          notify(t.login.wrongCreds);
        }
      }
    } catch (error) {
      console.error('Error al verificar el acceso:', error);
      notify(t.login.offlineLogin);
    } finally {
      setLoginBusy(false);
    }
  };

  /* ---------- Restablecer PIN ---------- */
  const openPinReset = (state: PinResetState) => {
    setResetContact('');
    setResetNewPin('');
    setPinReset(state);
  };

  const submitPinReset = async () => {
    if (!pinReset) return;
    if (!/^\d{4}$/.test(resetNewPin)) { notify(t.staffForm.invalidPin); return; }
    setResetBusy(true);
    try {
      if (pinReset.kind === 'staffForgot') {
        const s = staff.find(x => x.id === pinReset.staff?.id) || pinReset.staff;
        if (!s) return;
        if (!s.contact) { notify(t.pinReset.noContact); return; }
        if (normContact(resetContact) !== normContact(s.contact)) { notify(t.pinReset.mismatch); return; }
        setDoc(doc(db, 'staff', s.id), { pin: resetNewPin }, { merge: true }).catch(writeFailed);
      } else if (pinReset.kind === 'directionForgot') {
        const ref = doc(db, 'config', 'access');
        const snap = await getDoc(ref);
        const cfg: any = snap.exists() ? snap.data() : {};
        if (!cfg.directionContact) { notify(t.pinReset.noContact); return; }
        if (normContact(resetContact) !== cfg.directionContact) { notify(t.pinReset.mismatch); return; }
        setDoc(ref, { directionPin: resetNewPin }, { merge: true }).catch(writeFailed);
      } else if (pinReset.kind === 'staffByDirection' && pinReset.staff) {
        if (getRole() !== 'direction') { notify(t.alerts.noPermission); return; }
        setDoc(doc(db, 'staff', pinReset.staff.id), { pin: resetNewPin }, { merge: true }).catch(writeFailed);
      } else if (pinReset.kind === 'receptionByDirection') {
        if (getRole() !== 'direction') { notify(t.alerts.noPermission); return; }
        setDoc(doc(db, 'config', 'access'), { receptionPin: resetNewPin }, { merge: true }).catch(writeFailed);
      }
      setPinReset(null);
      setResetNewPin('');
      setResetContact('');
      setPin('');
      notify(t.pinReset.done);
    } catch (error) {
      console.error('Error al restablecer el PIN:', error);
      notify(t.login.offlineLogin);
    } finally {
      setResetBusy(false);
    }
  };

  /* ---------- Eliminación de todos los usuarios y datos (solo Dirección) ---------- */
  const performAccountDeletion = async () => {
    if (getRole() !== 'direction') { notify(t.alerts.noPermission); return; }
    if (offlineRaw) { notify(t.account.needOnline); return; }
    setDeleting(true);
    try {
      const collectionsToWipe = ['staff', 'tasks', 'reports', 'schedule', 'assignments', 'roomStates', 'supplyRequests', 'dailyCounts'];
      for (const name of collectionsToWipe) {
        const snap = await getDocs(collection(db, name));
        for (let i = 0; i < snap.docs.length; i += 400) {
          const batch = writeBatch(db);
          snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }
      await deleteDoc(doc(db, 'config', 'access'));
      await deleteDoc(doc(db, 'config', 'catalog'));

      // Si la app usa Firebase Auth, también se elimina el usuario autenticado
      try {
        const authUser = getAuth().currentUser;
        if (authUser) await deleteUser(authUser);
      } catch (authError) {
        console.warn('No se pudo eliminar el usuario de Auth (puede requerir reautenticación):', authError);
      }

      await AsyncStorage.multiRemove([
        HOTEL_STORAGE_KEY,
        ...['staff', 'tasks', 'reports', 'schedule', 'assignments', 'roomStates', 'supplyRequests', 'dailyCounts'].map(n => CACHE_PREFIX + n),
      ]);
      handleLogout();
      notify(t.account.done);
    } catch (error) {
      console.error('Error al eliminar la cuenta:', error);
      notify(t.account.failed);
    } finally {
      setDeleting(false);
    }
  };

  const askDeleteAccount = () => {
    setConfirm({
      title: t.account.confirmTitle, message: t.account.deleteInfoDirection, okLabel: t.account.confirmBtn, destructive: true,
      onOk: () => { setConfirm(null); performAccountDeletion(); },
    });
  };

  /* ---------- Habitaciones (plano) ---------- */
  const setRoomState = (id: string, status: string, prevStatus: string | null) => {
    setDoc(doc(db, 'roomStates', id), { status, prevStatus: prevStatus ?? null }, { merge: true }).catch(writeFailed);
  };

  const applyRoomStatus = (roomNumber: string, status: string) => {
    const room = rooms.find(r => r.id === roomNumber);
    if (!room) return;
    const prevStatus = status === 'blocked' ? (room.status === 'blocked' ? room.prevStatus : room.status) : room.prevStatus;
    setRoomState(roomNumber, status, prevStatus);
    const mapWork: Record<string, string> = { checkout: 'not_started', cleaning: 'in_progress', ready: 'done' };
    if (mapWork[status]) {
      todayAssignments.filter(a => a.room === roomNumber).forEach(a => {
        updateDoc(doc(db, 'assignments', a.id), { workStatus: mapWork[status] }).catch(writeFailed);
      });
    }
  };

  const changeWork = (item: Assignment, work: string) => {
    const role = getRole();
    if (role !== 'cleaning' && role !== 'governess') { notify(t.alerts.noPermission); return; }
    if (isRoomBlocked(item.room)) { notify(t.alerts.roomBlocked); return; }
    updateDoc(doc(db, 'assignments', item.id), { workStatus: work }).catch(writeFailed);
    const isDaily = item.taskType === 'daily';
    const status = work === 'in_progress' ? 'cleaning' : work === 'done' ? (isDaily ? 'occupied' : 'ready') : (isDaily ? 'daily' : 'checkout');
    const room = rooms.find(r => r.id === item.room);
    setRoomState(item.room, status, room?.prevStatus || null);
  };

  const toggleRoomBlock = (roomNumber: string) => {
    const role = getRole();
    if (role !== 'governess' && role !== 'maintenance') { notify(t.alerts.noPermission); return; }
    const room = rooms.find(r => r.id === roomNumber);
    if (!room) return;
    if (room.status === 'blocked') applyRoomStatus(roomNumber, room.prevStatus || 'checkout');
    else applyRoomStatus(roomNumber, 'blocked');
  };

  const toggleInspection = (a: Assignment) => {
    if (getRole() !== 'governess') { notify(t.alerts.noPermission); return; }
    if (isRoomBlocked(a.room)) { notify(t.alerts.roomBlocked); return; }
    updateDoc(doc(db, 'assignments', a.id), { inspected: !a.inspected }).catch(writeFailed);
  };

  /* ---------- Asignación de habitaciones del día ---------- */
  const assignDate = dateKey(addDays(new Date(), assignDayOffset));

  const submitAssignments = () => {
    const role = getRole();
    if (role !== 'governess' && role !== 'reception') { notify(t.alerts.noPermission); return; }
    const worker = staff.find(s => s.id === assignWorkerId && s.role === 'cleaning') || staff.find(s => s.role === 'cleaning');
    if (!worker) { notify(t.assign.noWorkers); return; }

    const groups: [Assignment['taskType'], string][] = [['daily', roomsDaily], ['out', roomsOut], ['inOut', roomsInOut]];
    const entries: { room: string; taskType: Assignment['taskType'] }[] = [];
    const invalid: string[] = [];
    groups.forEach(([taskType, txt]) => parseRooms(txt).forEach(r => {
      if (!ALL_ROOM_IDS.includes(r)) invalid.push(r);
      else entries.push({ room: r, taskType });
    }));
    if (invalid.length) { notify(t.assign.invalidRooms + invalid.join(', ')); return; }
    if (!entries.length) { notify(t.assign.nothing); return; }

    const batch = writeBatch(db);
    entries.forEach(e => {
      const id = `${assignDate}_${e.room}`;
      const existing = assignments.find(a => a.id === id);
      const sameWorker = existing?.staffId === worker.id;
      batch.set(doc(db, 'assignments', id), {
        date: assignDate, staffId: worker.id, staffName: worker.name, room: e.room, taskType: e.taskType,
        guestName: existing?.guestName || '',
        workStatus: sameWorker ? existing!.workStatus : 'not_started', // por defecto: aún no hecho
        inspected: sameWorker ? !!existing!.inspected : false,
        linen: existing?.linen || null,
        notes: existing?.notes || [],
      });
    });
    batch.commit().catch(writeFailed);
    setRoomsDaily(''); setRoomsOut(''); setRoomsInOut('');
    notify(t.assign.saved);
  };

  const removeAssignment = (id: string) => { deleteDoc(doc(db, 'assignments', id)).catch(writeFailed); };
  const updateGuestName = (a: Assignment, name: string) => {
    if ((a.guestName || '') === name.trim()) return;
    updateDoc(doc(db, 'assignments', a.id), { guestName: name.trim() }).catch(writeFailed);
  };

  /* ---------- Tareas (Firestore) ---------- */
  const openTaskModal = (prefill?: { role: string; text: string; requestId?: string }) => {
    const role = prefill?.role || 'cleaning';
    setSelectedTargetRole(role);
    setSelectedTargetStaff(staff.find(s => s.role === role)?.id || null);
    setNewTaskText(prefill?.text || '');
    setNewTaskRequestId(prefill?.requestId || null);
    setNewTaskModalVisible(true);
  };

  const pickTaskRole = (role: string) => {
    setSelectedTargetRole(role);
    setSelectedTargetStaff(staff.find(s => s.role === role)?.id || null);
  };

  const handleGovernessTask = () => {
    if (!newTaskText.trim()) { notify(t.alerts.taskEmpty); return; }
    const person = staff.find(s => s.id === selectedTargetStaff);
    const ref = doc(collection(db, 'tasks'));
    setDoc(ref, {
      targetRole: selectedTargetRole,
      targetName: person ? person.name : '',
      targetStaffId: person ? person.id : '',
      taskText: newTaskText.trim(),
      status: 'pending',
      requestId: newTaskRequestId || '',
      createdAt: Date.now(),
    }).catch(writeFailed);
    if (newTaskRequestId) {
      updateDoc(doc(db, 'supplyRequests', newTaskRequestId), { status: 'assigned', taskId: ref.id }).catch(writeFailed);
    }
    setNewTaskText('');
    setNewTaskRequestId(null);
    setNewTaskModalVisible(false);
    notify(t.alerts.taskSent);
  };

  const toggleTaskStatus = (task: TaskItem) => {
    const next = task.status === 'pending' ? 'done' : 'pending';
    updateDoc(doc(db, 'tasks', task.id), { status: next }).catch(writeFailed);
    if (task.requestId) {
      updateDoc(doc(db, 'supplyRequests', task.requestId), { status: next === 'done' ? 'done' : 'assigned' }).catch(writeFailed);
    }
  };

  /* ---------- Faltantes por planta (equipier → gobernante) ---------- */
  const submitSupplyRequest = () => {
    if (!supplyText.trim()) { notify(t.supply.textEmpty); return; }
    setDoc(doc(collection(db, 'supplyRequests')), {
      floor: supplyFloor, text: supplyText.trim(),
      author: session?.username || '', authorId: session?.staffId || '',
      status: 'open', createdAt: Date.now(),
    }).catch(writeFailed);
    setSupplyText('');
    setSupplyModalVisible(false);
    notify(t.supply.sent);
  };

  /* ---------- Lencería y notas por habitación ---------- */
  const openLinen = (item: Assignment, category: string) => {
    const role = getRole();
    if (role !== 'cleaning' && role !== 'governess') { notify(t.alerts.noPermission); return; }
    if (isRoomBlocked(item.room)) { notify(t.alerts.roomBlocked); return; }
    const ids = catalog.filter(c => c.category === category).map(c => c.id);
    const hasRecord = !!item.linen && ids.some(id => id in (item.linen as Record<string, number>));
    const form: Record<string, number> = {};
    catalog.filter(c => c.category === category).forEach(c => {
      form[c.id] = hasRecord ? (item.linen as Record<string, number>)[c.id] || 0 : c.qty || 0;
    });
    setLinenForm(form);
    setLinenModal({ item, category });
  };

  const updateLinenCount = (id: string, delta: number) => {
    setLinenForm(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  };

  const saveLinen = () => {
    if (!linenModal) return;
    const { item, category } = linenModal;
    const idsInCategory = catalog.filter(c => c.category === category).map(c => c.id);
    const current = assignments.find(a => a.id === item.id) || item;
    const merged: Record<string, number> = { ...(current.linen || {}) };
    idsInCategory.forEach(id => { delete merged[id]; });
    Object.keys(linenForm).forEach(id => { if (linenForm[id] > 0) merged[id] = linenForm[id]; });
    updateDoc(doc(db, 'assignments', item.id), { linen: merged }).catch(writeFailed);
    setLinenModal(null);
    notify(t.alerts.linenSaved);
  };

  const summarizeLinen = (linen: Record<string, number> | null | undefined, categories?: string[]) => {
    if (!linen) return '';
    return Object.keys(linen)
      .filter(id => linen[id] > 0)
      .map(id => {
        const it = catalog.find(c => c.id === id);
        if (!it || (categories && !categories.includes(it.category))) return null;
        return `${linen[id]} × ${itemName(it)}`;
      })
      .filter(Boolean)
      .join(', ');
  };

  const submitNote = () => {
    if (!infoAssignmentId) return;
    if (!noteText.trim()) { notify(t.cleaningView.noteEmpty); return; }
    const note: AssignmentNote = { id: uid('n'), author: session?.username || '', text: noteText.trim(), date: new Date().toISOString() };
    updateDoc(doc(db, 'assignments', infoAssignmentId), { notes: arrayUnion(note) }).catch(writeFailed);
    setNoteText('');
    notify(t.cleaningView.noteSent);
  };

  /* ---------- Mantenimiento (Firestore) ---------- */
  const submitReport = () => {
    if (!reportText.trim()) { notify(t.alerts.reportEmpty); return; }
    const ref = doc(collection(db, 'reports'));
    setDoc(ref, {
      room: reportModalRoom || '', text: reportText.trim(),
      author: session?.username || '', date: new Date().toISOString(),
    }).catch(writeFailed);
    setReportText('');
    setReportModalRoom(null);
    notify(t.alerts.reportSent);
  };

  const removeReport = (id: string) => { deleteDoc(doc(db, 'reports', id)).catch(writeFailed); };

  /* ---------- Equipo (Firestore) ---------- */
  const resetStaffForm = () => {
    setEditingStaffId(null);
    setNewStaffName(''); setNewStaffRole('cleaning'); setNewStaffPosition('');
    setNewStaffStart(''); setNewStaffEnd(''); setNewStaffPin(''); setNewStaffContact('');
  };

  const startEditStaff = (s: StaffMember) => {
    setEditingStaffId(s.id);
    setNewStaffName(s.name || ''); setNewStaffRole(s.role || 'cleaning'); setNewStaffPosition(s.position || '');
    setNewStaffStart(s.startDate || ''); setNewStaffEnd(s.endDate || ''); setNewStaffPin(s.pin || '');
    setNewStaffContact(s.contact || '');
  };

  const saveStaffMember = () => {
    const name = newStaffName.trim();
    if (!name) { notify(t.alerts.nameRequired); return; }
    if (!/^\d{4}$/.test(newStaffPin)) { notify(t.staffForm.invalidPin); return; }
    const start = newStaffStart.trim();
    const end = newStaffEnd.trim();
    if ((start && !isValidDateStr(start)) || (end && !isValidDateStr(end))) { notify(t.staffForm.invalidDate); return; }
    if (start && end && end < start) { notify(t.staffForm.invalidRange); return; }
    const contactValue = newStaffContact.trim();
    if (contactValue && !isValidContact(contactValue)) { notify(t.staffForm.invalidContact); return; }

    const id = editingStaffId || doc(collection(db, 'staff')).id;
    const payload: Record<string, any> = {
      name, role: newStaffRole, position: newStaffPosition.trim(), startDate: start, endDate: end, pin: newStaffPin,
      contact: contactValue ? normContact(contactValue) : '',
    };
    if (!editingStaffId) payload.createdAt = Date.now();

    // Sin await: el listener onSnapshot refleja el cambio al instante (también sin red)
    setDoc(doc(db, 'staff', id), payload, { merge: true }).catch(writeFailed);
    resetStaffForm();
    notify(t.staffForm.saved);
  };

  const askRemoveStaff = (s: StaffMember) => {
    setConfirm({
      title: t.staffForm.delTitle,
      message: t.staffForm.delMsg.replace('{name}', s.name),
      okLabel: t.staffForm.delOk, destructive: true,
      onOk: () => {
        setConfirm(null);
        if (editingStaffId === s.id) resetStaffForm();
        deleteDoc(doc(db, 'staff', s.id)).catch(writeFailed);
      },
    });
  };

  /* ---------- Utensilios (catálogo compartido en Firestore) ---------- */
  const saveCatalog = (items: any[]) => {
    setDoc(doc(db, 'config', 'catalog'), { items }).catch(writeFailed);
  };
  const updateCatalogItem = (id: string, patch: any) => saveCatalog(catalog.map(c => (c.id === id ? { ...c, ...patch } : c)));
  const removeCatalogItem = (id: string) => saveCatalog(catalog.filter(c => c.id !== id));
  const addCatalogItem = () => {
    if (!newItemName.trim()) { notify(t.alerts.nameRequired); return; }
    saveCatalog([...catalog, { id: uid('it'), name: newItemName.trim(), category: newItemCategory, qty: 0 }]);
    setNewItemName('');
  };

  /* ---------- Conteo diario (equipier) e impresión ---------- */
  const changeCount = (itemId: string, delta: number) => {
    const current = todayCounts[itemId] || 0;
    const next = Math.max(0, current + delta);
    if (next === current) return;
    setDoc(doc(db, 'dailyCounts', todayKey), { counts: { [itemId]: next }, updatedBy: session?.username || '' }, { merge: true }).catch(writeFailed);
  };

  const printDailyCount = async () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let grandTotal = 0;
    const sections = CATALOG_CATEGORIES.map(cat => {
      const rows = catalog.filter(c => c.category === cat && (todayCounts[c.id] || 0) > 0);
      if (!rows.length) return '';
      const subtotal = rows.reduce((sum, c) => sum + (todayCounts[c.id] || 0), 0);
      grandTotal += subtotal;
      return `<h2>${esc(t.cleaning[cat])}</h2>
        <table><tr><th>${esc(t.count.article)}</th><th class="n">${esc(t.count.qty)}</th></tr>
        ${rows.map(c => `<tr><td>${esc(itemName(c))}</td><td class="n">${todayCounts[c.id]}</td></tr>`).join('')}
        <tr class="tot"><td>${esc(t.count.total)}</td><td class="n">${subtotal}</td></tr></table>`;
    }).join('');

    const html = `<html><head><meta charset="utf-8"/>
      <style>
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 28px; color: #0F172A; }
        h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 15px; margin: 22px 0 6px; }
        .meta { font-size: 12px; color: #475569; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border-bottom: 1px solid #CBD5E1; padding: 6px 4px; text-align: left; }
        .n { text-align: right; width: 90px; } .tot td { font-weight: bold; border-top: 2px solid #0F172A; }
        .grand { margin-top: 18px; font-size: 15px; font-weight: bold; text-align: right; }
      </style></head><body>
      <h1>${esc(t.appTitle)} — ${esc(t.count.sheetTitle)}</h1>
      <div class="meta">${esc(t.count.date)}: ${esc(todayKey)}</div>
      <div class="meta">${esc(t.count.by)}: ${esc(session?.username || '')} · ${esc(t.count.printedAt)} ${esc(new Date().toLocaleString())}</div>
      ${sections || `<p>${esc(t.count.none)}</p>`}
      ${grandTotal ? `<div class="grand">${esc(t.count.total)}: ${grandTotal}</div>` : ''}
      </body></html>`;

    try {
      await Print.printAsync({ html });
    } catch (error: any) {
      const msg = String(error?.message || error);
      if (!/did not complete|cancel/i.test(msg)) {
        console.error('Error de impresión:', error);
        notify(t.count.printFailed);
      }
    }
  };

  /* ---------- Planning (horarios escritos, en Firestore) ---------- */
  const changeMonth = (delta: number) => {
    const d = new Date(planYear, planMonth + delta, 1);
    setPlanYear(d.getFullYear());
    setPlanMonth(d.getMonth());
    setPlanWeek(0);
  };

  const openShiftEdit = (s: StaffMember, key: string) => {
    const role = getRole();
    if (role !== 'governess' && role !== 'direction') return;
    setShiftEdit({ staffId: s.id, name: s.name, key, text: schedule[`${s.id}|${key}`] || '' });
  };

  const saveShift = () => {
    if (!shiftEdit) return;
    const text = shiftEdit.text.trim();
    const ref = doc(db, 'schedule', `${shiftEdit.staffId}_${shiftEdit.key}`);
    if (!text) deleteDoc(ref).catch(writeFailed);
    else setDoc(ref, { staffId: shiftEdit.staffId, date: shiftEdit.key, text }).catch(writeFailed);
    setShiftEdit(null);
  };

  const clearShift = () => {
    if (!shiftEdit) return;
    deleteDoc(doc(db, 'schedule', `${shiftEdit.staffId}_${shiftEdit.key}`)).catch(writeFailed);
    setShiftEdit(null);
  };

  /* ---------- Piezas nuevas reutilizables ---------- */
  const renderPinResetModal = () => {
    const kind = pinReset?.kind;
    const needsContactInput = kind === 'staffForgot' || kind === 'directionForgot';
    const subtitle =
      kind === 'staffByDirection' ? `${t.pinReset.forStaff} ${pinReset?.staff?.name || ''}`
      : kind === 'receptionByDirection' ? t.pinReset.receptionTitle
      : t.pinReset.forgotInfo;
    return (
      <Modal visible={!!pinReset} animationType="slide" transparent={true} onRequestClose={() => setPinReset(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔑 {t.pinReset.title}</Text>
            <Text style={styles.modalSubTitle}>{subtitle}</Text>

            {needsContactInput && (
              <>
                <Text style={styles.inputLabel}>{t.pinReset.contact}</Text>
                <TextInput
                  style={styles.input} placeholder={t.pinReset.contactPH} placeholderTextColor="#64748B"
                  autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
                  value={resetContact} onChangeText={setResetContact}
                />
              </>
            )}

            <Text style={styles.inputLabel}>{t.pinReset.newPin}</Text>
            <TextInput
              style={styles.input} placeholder="••••" placeholderTextColor="#64748B"
              secureTextEntry keyboardType="numeric" maxLength={4}
              value={resetNewPin} onChangeText={v => setResetNewPin(v.replace(/\D/g, ''))}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#64748B', flex: 1 }]} onPress={() => setPinReset(null)}>
                <Text style={styles.modalCloseText}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: '#0284C7', flex: 1, opacity: resetBusy ? 0.6 : 1 }]}
                onPress={submitPinReset} disabled={resetBusy}
              >
                {resetBusy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalCloseText}>{t.pinReset.confirm}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  /* ---------- Piezas reutilizables ---------- */
  const renderLangBar = () => (
    <View style={styles.langBar}>
      {[
        { code: 'es', label: 'ES' }, { code: 'en', label: 'EN' }, { code: 'fr', label: 'FR' },
        { code: 'it', label: 'IT' }, { code: 'pt', label: 'PT' }, { code: 'ru', label: 'RU' }, { code: 'uk', label: 'UK' },
      ].map(lang => (
        <TouchableOpacity
          key={lang.code}
          onPress={() => changeLanguage(lang.code)}
          style={[styles.langChip, currentLang === lang.code && styles.langChipActive]}
        >
          <Text style={[styles.langChipText, currentLang === lang.code && styles.langChipTextActive]}>{lang.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOfflineBanner = () =>
    showOffline ? (
      <View style={[styles.offlineBar, permissionIssue && styles.offlineBarError]}>
        <Text style={styles.offlineText}>{permissionIssue ? t.offline.loadError : t.offline.banner}</Text>
      </View>
    ) : null;

  const renderLegalModals = () => (
    <>
      <Modal visible={helpModalVisible} animationType="slide" transparent={true} onRequestClose={() => setHelpModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.modalHelp.title}</Text>
            <Text style={styles.modalBody}>{t.modalHelp.content}</Text>
            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#0284C7', marginTop: 15 }]} onPress={() => setHelpModalVisible(false)}>
              <Text style={styles.modalCloseText}>{t.modalHelp.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={termsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setTermsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.modalTerms.title}</Text>
            <ScrollView style={{ maxHeight: 360, marginVertical: 8 }}>
              {t.modalTerms.clauses.map((c: string, i: number) => (
                <Text key={i} style={styles.termsClause}>{c}</Text>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#0284C7', marginTop: 10 }]} onPress={() => setTermsModalVisible(false)}>
              <Text style={styles.modalCloseText}>{t.modalTerms.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={privacyModalVisible} animationType="slide" transparent={true} onRequestClose={() => setPrivacyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.privacy.title}</Text>
            <ScrollView style={{ maxHeight: 360, marginVertical: 8 }}>
              {t.privacy.clauses.map((c: string, i: number) => (
                <Text key={i} style={styles.termsClause}>{c}</Text>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#0284C7', marginTop: 10 }]} onPress={() => setPrivacyModalVisible(false)}>
              <Text style={styles.modalCloseText}>{t.privacy.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );

  const renderConfirmModal = () => (
    <Modal visible={!!confirm} animationType="fade" transparent={true} onRequestClose={() => setConfirm(null)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{confirm?.title}</Text>
          <Text style={styles.modalBody}>{confirm?.message}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#64748B', flex: 1 }]} onPress={() => setConfirm(null)}>
              <Text style={styles.modalCloseText}>{t.common.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: confirm?.destructive ? '#DC2626' : '#0284C7', flex: 1 }]}
              onPress={() => confirm?.onOk()}
            >
              <Text style={styles.modalCloseText}>{confirm?.okLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  /* ============================================================
     0) TÉRMINOS Y CONDICIONES (primer arranque)
     ============================================================ */
  if (termsAccepted === null) {
    return (
      <SafeAreaView style={[styles.container, styles.centerBox]}>
        <ActivityIndicator size="large" color="#0284C7" />
      </SafeAreaView>
    );
  }

  if (!termsAccepted) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          {renderLangBar()}
          <Text style={styles.appTitle}>{t.appTitle}</Text>

          {termsDeclined ? (
            <View style={[styles.feedCard, { marginTop: 20 }]}>
              <Text style={styles.feedCardTitle}>{t.terms.declinedTitle}</Text>
              <Text style={[styles.modalBody, { marginBottom: 12 }]}>{t.terms.declinedBody}</Text>
              <TouchableOpacity style={[styles.actionFeedButton, { backgroundColor: '#0284C7' }]} onPress={() => setTermsDeclined(false)}>
                <Text style={styles.actionFeedButtonText}>{t.terms.review}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.feedCard, { marginTop: 20 }]}>
              <Text style={styles.feedCardTitle}>{t.terms.title}</Text>
              <Text style={styles.feedCardSubtitle}>{t.terms.intro}</Text>
              <ScrollView style={{ maxHeight: 320, marginBottom: 12 }} nestedScrollEnabled>
                <Text style={styles.sectionTitle}>{t.modalTerms.title}</Text>
                {t.modalTerms.clauses.map((c: string, i: number) => (
                  <Text key={'t' + i} style={styles.termsClause}>{c}</Text>
                ))}
                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>{t.privacy.title}</Text>
                {t.privacy.clauses.map((c: string, i: number) => (
                  <Text key={'p' + i} style={styles.termsClause}>{c}</Text>
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#64748B', flex: 1 }]} onPress={() => setTermsDeclined(true)}>
                  <Text style={styles.modalCloseText}>{t.terms.decline}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#047857', flex: 1 }]} onPress={acceptTerms}>
                  <Text style={styles.modalCloseText}>{t.terms.accept}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ============================================================
     1) PANTALLA CON SESIÓN INICIADA
     ============================================================ */
  if (session) {
    const roleKey = session.role || 'cleaning';
    const roleMeta = rolesList.find(r => r.id === roleKey);
    const currentName = session.username;

    const isDirection = roleKey === 'direction';
    const isGoverness = roleKey === 'governess';
    const isReception = roleKey === 'reception';
    const canEditPlanning = isDirection || isGoverness;
    const canAssign = isGoverness || isReception;

    // Pestañas por perfil (Ajustes en todos)
    const settingsTab = { id: 'settings', label: t.feed.tabSettings };
    const assignTab = { id: 'assign', label: t.feed.tabAssign };
    let tabs: { id: string; label: string }[] = [];
    if (isDirection) tabs = [
      { id: 'dashboard', label: t.feed.tabDashboard }, { id: 'map', label: t.feed.tabMap },
      { id: 'planning', label: t.feed.tabPlanning }, { id: 'staff', label: t.feed.tabStaff }, settingsTab,
    ];
    else if (isGoverness) tabs = [
      { id: 'dashboard', label: t.feed.tabDashboard }, assignTab, { id: 'map', label: t.feed.tabMap },
      { id: 'planning', label: t.feed.tabPlanning }, { id: 'items', label: t.feed.tabItems }, settingsTab,
    ];
    else if (isReception) tabs = [{ id: 'map', label: t.feed.tabMap }, assignTab, settingsTab];
    else tabs = [
      { id: 'dashboard', label: t.feed.tabDashboard }, { id: 'planning', label: t.feed.tabPlanning }, settingsTab,
    ];
    const defaultTab = isReception ? 'map' : 'dashboard';
    const activeTab = tabs.some(x => x.id === activeViewMode) ? activeViewMode : defaultTab;

    const myDelegatedTasks = governessTasks.filter(task =>
      task.targetRole === roleKey &&
      ((!task.targetStaffId && !task.targetName) || task.targetStaffId === session.staffId || task.targetName === currentName)
    );

    const me = staff.find(s => s.id === session.staffId);
    const todayShiftText = me ? (schedule[`${me.id}|${todayKey}`] || '—') : '—';
    const myAssignments = todayAssignments.filter(a => a.staffId === session.staffId);
    const infoAssignment = assignments.find(a => a.id === infoAssignmentId) || null;

    const taskTypeLabel = (type: string) => t.dashboard.taskTypes[type] || type;
    const requestStatusLabel = (s: string) => (s === 'done' ? t.supply.done : s === 'assigned' ? t.supply.assigned : t.supply.open);
    const requestStatusColor = (s: string) => (s === 'done' ? '#10B981' : s === 'assigned' ? '#0284C7' : '#F59E0B');

    /* ----- Plano del hotel ----- */
    const renderMap = () => {
      const swap = isDirection;
      const canEditRooms = isReception || isGoverness;
      const floorsList = FLOORS.map(f => f.f);
      const circle = (r: any) => (
        <RoomCircle key={r.id} id={r.id} status={r.status} color={statusColor(r.status, swap)} onPress={canEditRooms ? () => setStatusModalRoom(r) : undefined} />
      );
      const dot = (s: string) => (
        <View style={[styles.legendDot, { backgroundColor: statusColor(s, swap), borderColor: s === 'daily' ? '#94A3B8' : statusColor(s, swap) }]} />
      );

      return (
        <View style={styles.feedCard}>
          <View style={styles.feedCardHeader}>
            <Text style={styles.feedCardTitle}>{t.mapView.title}</Text>
            <Text style={styles.feedCardSubtitle}>{t.mapView.subtitle}</Text>
          </View>

          <View style={styles.legendRow}>
            {STATUS_KEYS.map(s => (
              <View key={s} style={styles.legendItem}>
                {dot(s)}
                <Text style={styles.legendText}>{t.mapView.status[s]}</Text>
              </View>
            ))}
          </View>

          <View style={styles.viewToggleContainer}>
            {(['general', 'active'] as const).map(m => (
              <TouchableOpacity key={m} style={[styles.viewToggleBtn, mapMode === m && styles.viewToggleBtnActive]} onPress={() => setMapMode(m)}>
                <Text style={[styles.viewToggleText, mapMode === m && styles.viewToggleTextActive]}>{t.mapView[m]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {mapMode === 'general' ? (
            floorsList.map(floor => (
              <View key={floor} style={styles.floorSectionBox}>
                <Text style={styles.floorTitle}>🏢 {t.mapView.floor}: {floor}</Text>
                <View style={styles.circleGrid}>
                  {rooms.filter(r => r.floor === floor).map(circle)}
                </View>
              </View>
            ))
          ) : (
            SECTION_GROUPS.map(section => (
              <View key={section.key} style={styles.floorSectionBox}>
                <Text style={styles.floorTitle}>{t.mapView[section.key]}</Text>
                {section.statuses.map(s => {
                  const list = rooms.filter(r => r.status === s);
                  return (
                    <View key={s} style={{ marginBottom: 8 }}>
                      <View style={styles.statusHeaderRow}>
                        {dot(s)}
                        <Text style={styles.statusHeaderText}>{t.mapView.status[s]} ({list.length})</Text>
                      </View>
                      {list.length > 0 ? (
                        <View style={styles.circleGrid}>{list.map(circle)}</View>
                      ) : (
                        <Text style={styles.emptyText}>{t.mapView.empty}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>
      );
    };

    /* ----- Planning: horarios escritos y editables por trabajador ----- */
    const renderPlanning = () => {
      const weeks = getWeeks(planYear, planMonth);
      const weekIdx = Math.min(planWeek, weeks.length - 1);
      const week = weeks[weekIdx];
      const visibleStaff = canEditPlanning ? staff : staff.filter(s => s.id === session.staffId);

      return (
        <View style={styles.feedCard}>
          <View style={styles.feedCardHeader}>
            <Text style={styles.feedCardTitle}>{t.planning.title}</Text>
            <Text style={styles.feedCardSubtitle}>{canEditPlanning ? t.planningEdit.tapHint : t.planning.hintView}</Text>
          </View>

          <View style={styles.monthRow}>
            <TouchableOpacity style={styles.monthArrow} onPress={() => changeMonth(-1)}><Text style={styles.monthArrowText}>◀</Text></TouchableOpacity>
            <Text style={styles.monthLabel}>{t.planning.months[planMonth]} {planYear}</Text>
            <TouchableOpacity style={styles.monthArrow} onPress={() => changeMonth(1)}><Text style={styles.monthArrowText}>▶</Text></TouchableOpacity>
          </View>

          <View style={styles.weekPills}>
            {weeks.map((w, i) => (
              <TouchableOpacity key={i} style={[styles.weekPill, weekIdx === i && styles.weekPillActive]} onPress={() => setPlanWeek(i)}>
                <Text style={[styles.weekPillText, weekIdx === i && styles.weekPillTextActive]}>{t.planning.week} {i + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {visibleStaff.length === 0 ? (
            <Text style={styles.emptyText}>{t.planning.noStaff}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.planRow}>
                  <View style={styles.planNameCell} />
                  {week.map((d, i) => {
                    const inMonth = d.getMonth() === planMonth;
                    const isToday = dateKey(d) === todayKey;
                    return (
                      <View key={i} style={[styles.planHeadCell, isToday && styles.planHeadToday]}>
                        <Text style={[styles.planHeadDay, !inMonth && { opacity: 0.35 }]}>{t.planning.days[i]}</Text>
                        <Text style={[styles.planHeadNum, !inMonth && { opacity: 0.35 }]}>{d.getDate()}</Text>
                      </View>
                    );
                  })}
                  <View style={styles.planHoursCell}><Text style={styles.planHeadDay}>{t.planning.hours}</Text></View>
                </View>

                {visibleStaff.map(s => {
                  let total = 0;
                  return (
                    <View key={s.id} style={styles.planRow}>
                      <View style={styles.planNameCell}>
                        <Text style={styles.planNameText} numberOfLines={1}>{s.name}</Text>
                        <Text style={styles.planRoleText} numberOfLines={1}>{s.position || t.roles[s.role]?.title}</Text>
                      </View>
                      {week.map((d, i) => {
                        const key = dateKey(d);
                        const inMonth = d.getMonth() === planMonth;
                        const text = schedule[`${s.id}|${key}`] || '';
                        if (text) total += hoursFromText(text);
                        return (
                          <TouchableOpacity
                            key={i}
                            disabled={!inMonth || !canEditPlanning}
                            onPress={() => openShiftEdit(s, key)}
                            style={[styles.planCell, { backgroundColor: text ? '#DBEAFE' : '#F8FAFC' }, !inMonth && { opacity: 0.35 }]}
                          >
                            <Text style={styles.planCellText} numberOfLines={3}>{text}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      <View style={styles.planHoursCell}><Text style={styles.planHoursText}>{total > 0 ? total : '–'}</Text></View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      );
    };

    /* ----- Asignación de habitaciones del día (gobernante / recepción) ----- */
    const renderAssign = () => {
      const cleaners = staff.filter(s => s.role === 'cleaning');
      const selectedWorker = assignWorkerId && cleaners.some(c => c.id === assignWorkerId) ? assignWorkerId : (cleaners[0]?.id || null);
      const dayList = assignments.filter(a => a.date === assignDate);
      const byWorker: Record<string, Assignment[]> = {};
      dayList.forEach(a => { (byWorker[a.staffName || '—'] = byWorker[a.staffName || '—'] || []).push(a); });
      const dayLabel = assignDayOffset === 0
        ? `${t.assign.today} · ${assignDate}`
        : new Date(`${assignDate}T00:00:00`).toLocaleDateString();

      const roomInput = (label: string, color: string, value: string, setter: (v: string) => void) => (
        <View style={{ marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={[styles.legendDot, { backgroundColor: color, borderColor: color }]} />
            <Text style={styles.inputLabel}>{label}</Text>
          </View>
          <TextInput
            style={styles.input} placeholder={t.assign.roomsPH} placeholderTextColor="#64748B"
            autoCapitalize="characters" autoCorrect={false} value={value} onChangeText={setter}
          />
        </View>
      );

      return (
        <View style={styles.feedCard}>
          <View style={styles.feedCardHeader}>
            <Text style={styles.feedCardTitle}>{t.assign.title}</Text>
            <Text style={styles.feedCardSubtitle}>{t.assign.sub}</Text>
          </View>

          <View style={styles.hintBox}><Text style={styles.hintText}>{t.assign.howto}</Text></View>

          <View style={styles.dayNav}>
            <TouchableOpacity style={styles.monthArrow} onPress={() => setAssignDayOffset(v => v - 1)}><Text style={styles.monthArrowText}>◀</Text></TouchableOpacity>
            <Text style={styles.monthLabel}>{dayLabel}</Text>
            <TouchableOpacity style={styles.monthArrow} onPress={() => setAssignDayOffset(v => v + 1)}><Text style={styles.monthArrowText}>▶</Text></TouchableOpacity>
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>{t.assign.worker}</Text>
            {cleaners.length === 0 ? (
              <Text style={styles.emptyText}>{t.assign.noWorkers}</Text>
            ) : (
              <View style={[styles.pillRow, { flexWrap: 'wrap' }]}>
                {cleaners.map(c => (
                  <TouchableOpacity key={c.id} style={[styles.personChip, selectedWorker === c.id && styles.personChipActive]} onPress={() => setAssignWorkerId(c.id)}>
                    <Text style={[styles.deptPillText, selectedWorker === c.id && styles.deptPillTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {roomInput(t.assign.daily, TASK_TYPE_COLORS.daily, roomsDaily, setRoomsDaily)}
            {roomInput(t.assign.out, TASK_TYPE_COLORS.out, roomsOut, setRoomsOut)}
            {roomInput(t.assign.inOut, TASK_TYPE_COLORS.inOut, roomsInOut, setRoomsInOut)}

            <TouchableOpacity style={[styles.actionFeedButton, { backgroundColor: '#5b21b6' }]} onPress={submitAssignments}>
              <Text style={styles.actionFeedButtonText}>{t.assign.add}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>{t.assign.listTitle} ({dayList.length})</Text>
            {dayList.length === 0 && <Text style={styles.emptyText}>{t.assign.empty}</Text>}
            {Object.keys(byWorker).map(worker => (
              <View key={worker} style={{ marginBottom: 10 }}>
                <Text style={styles.floorTitle}>👤 {worker} ({byWorker[worker].length})</Text>
                <View style={styles.roomsNotesList}>
                  {byWorker[worker].map(a => (
                    <View key={a.id} style={[styles.roomNoteRow, { borderLeftColor: TASK_TYPE_COLORS[a.taskType] }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.noteRoomNum}>{t.common.room} {a.room} · {taskTypeLabel(a.taskType)}</Text>
                        <Text style={styles.bedHistoryNormal}>{t.dashboard.cleaningLabel}{workLabel(a.workStatus)}</Text>
                        <TextInput
                          key={`${a.id}-${a.guestName || ''}`}
                          style={styles.guestInput} placeholder={t.assign.guestPH} placeholderTextColor="#94A3B8"
                          defaultValue={a.guestName || ''} onEndEditing={e => updateGuestName(a, e.nativeEvent.text)}
                        />
                      </View>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => removeAssignment(a.id)}>
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    };

    /* ----- Equipo y contratos (Dirección) ----- */
    const renderStaff = () => {
      return (
        <View style={styles.feedCard}>
          <View style={styles.feedCardHeader}>
            <Text style={styles.feedCardTitle}>{t.staff.title}</Text>
          </View>

          <View style={styles.hintBox}>
            <Text style={styles.hintText}>{t.staffForm.hint}</Text>
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>{editingStaffId ? t.staffForm.edit : t.staff.addTitle}</Text>

            <Text style={styles.inputLabel}>{t.staff.name}</Text>
            <TextInput style={styles.input} placeholder={t.staff.namePH} placeholderTextColor="#64748B" value={newStaffName} onChangeText={setNewStaffName} />

            <Text style={styles.inputLabel}>{t.staffForm.position}</Text>
            <TextInput style={styles.input} placeholder={t.staffForm.positionPH} placeholderTextColor="#64748B" value={newStaffPosition} onChangeText={setNewStaffPosition} />

            <Text style={styles.inputLabel}>{t.staff.role}</Text>
            <View style={[styles.pillRow, { flexWrap: 'wrap' }]}>
              {STAFF_ROLES.map(r => (
                <TouchableOpacity key={r} style={[styles.deptPill, newStaffRole === r && styles.deptPillActive]} onPress={() => setNewStaffRole(r)}>
                  <Text style={[styles.deptPillText, newStaffRole === r && styles.deptPillTextActive]} numberOfLines={1}>{t.roles[r].title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t.staffForm.start}</Text>
                <TextInput style={styles.input} placeholder={t.staffForm.datePH} placeholderTextColor="#64748B" value={newStaffStart} onChangeText={setNewStaffStart} maxLength={10} keyboardType="numbers-and-punctuation" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t.staffForm.end}</Text>
                <TextInput style={styles.input} placeholder={t.staffForm.datePH} placeholderTextColor="#64748B" value={newStaffEnd} onChangeText={setNewStaffEnd} maxLength={10} keyboardType="numbers-and-punctuation" />
              </View>
            </View>

            <Text style={styles.inputLabel}>{t.staffForm.contact}</Text>
            <TextInput
              style={styles.input} placeholder={t.staffForm.contactPH} placeholderTextColor="#64748B"
              autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
              value={newStaffContact} onChangeText={setNewStaffContact}
            />

            <Text style={styles.inputLabel}>{t.staffForm.pin}</Text>
            <TextInput
              style={styles.input} placeholder={t.staffForm.pinPH} placeholderTextColor="#64748B"
              keyboardType="numeric" maxLength={4} secureTextEntry value={newStaffPin} onChangeText={v => setNewStaffPin(v.replace(/\D/g, ''))}
            />

            <TouchableOpacity style={[styles.actionFeedButton, { backgroundColor: '#1E293B' }]} onPress={saveStaffMember}>
              <Text style={styles.actionFeedButtonText}>{editingStaffId ? t.staffForm.update : t.staff.save}</Text>
            </TouchableOpacity>
            {editingStaffId && (
              <TouchableOpacity style={[styles.actionFeedButton, { backgroundColor: '#64748B', marginTop: 8 }]} onPress={resetStaffForm}>
                <Text style={styles.actionFeedButtonText}>{t.staffForm.cancelEdit}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>{t.staff.listTitle} ({staff.length})</Text>
            {!staffCol.ready && <ActivityIndicator color="#0284C7" />}
            {staffCol.ready && staff.length === 0 && <Text style={styles.emptyText}>{t.staff.empty}</Text>}
            <View style={styles.roomsNotesList}>
              {staff.map(s => {
                const meta = rolesList.find(r => r.id === s.role);
                const ended = !!s.endDate && s.endDate < todayKey;
                return (
                  <View key={s.id} style={[styles.roomNoteRow, { borderLeftColor: meta?.color }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noteRoomNum}>{s.name}</Text>
                      <Text style={styles.guestNameText}>{meta?.icon} {t.roles[s.role]?.title}{s.position ? ` · ${s.position}` : ''}</Text>
                      <Text style={styles.bedHistoryNormal}>
                        {t.staffForm.period}: {s.startDate || '—'} → {s.endDate || t.staffForm.openEnded}
                      </Text>
                      {!!s.contact && <Text style={styles.bedHistoryNormal}>📇 {s.contact}</Text>}
                      {ended && <Text style={styles.blockedWarningText}>{t.staffForm.ended}</Text>}
                    </View>
                    <TouchableOpacity style={styles.editIconBtn} onPress={() => openPinReset({ kind: 'staffByDirection', staff: s })}>
                      <Text style={styles.editIconText}>🔑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editIconBtn} onPress={() => startEditStaff(s)}>
                      <Text style={styles.editIconText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => askRemoveStaff(s)}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      );
    };

    /* ----- Ajustes / Perfil. La zona roja de eliminación existe SOLO en Dirección ----- */
    const renderSettings = () => (
      <View style={styles.feedCard}>
        <View style={styles.feedCardHeader}>
          <Text style={styles.feedCardTitle}>{t.settings.title}</Text>
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{t.settings.profile}</Text>
          <Text style={styles.guestNameText}>{t.settings.user}: @{currentName}</Text>
          <Text style={styles.guestNameText}>{t.settings.roleLabel}: {roleMeta?.icon} {t.roles[roleKey]?.title}</Text>
          {me?.position ? <Text style={styles.guestNameText}>{t.staffForm.position}: {me.position}</Text> : null}
        </View>

        {isDirection && (
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>{t.settings.credentials}</Text>
            <Text style={styles.directionSubText}>{t.settings.info}</Text>
            <TouchableOpacity style={styles.settingsLink} onPress={() => openPinReset({ kind: 'receptionByDirection' })}>
              <Text style={styles.settingsLinkText}>{t.settings.receptionPin}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{t.settings.legal}</Text>
          <TouchableOpacity style={styles.settingsLink} onPress={() => setTermsModalVisible(true)}><Text style={styles.settingsLinkText}>{t.settings.terms}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.settingsLink} onPress={() => setPrivacyModalVisible(true)}><Text style={styles.settingsLinkText}>{t.settings.privacy}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.settingsLink} onPress={() => setHelpModalVisible(true)}><Text style={styles.settingsLinkText}>{t.settings.help}</Text></TouchableOpacity>
        </View>

        {isDirection && (
          <View style={[styles.sectionBox, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.sectionTitle, { color: '#B91C1C' }]}>{t.settings.danger}</Text>
            <Text style={styles.directionSubText}>{t.account.deleteInfoDirection}</Text>
            <TouchableOpacity
              style={[styles.actionFeedButton, { backgroundColor: '#DC2626', opacity: deleting ? 0.6 : 1 }]}
              onPress={askDeleteAccount}
              disabled={deleting}
            >
              {deleting ? (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.actionFeedButtonText}>{t.account.deleting}</Text>
                </View>
              ) : (
                <Text style={styles.actionFeedButtonText}>{t.account.deleteBtn}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );

    /* ----- Conteo del día (equipier edita; gobernante consulta e imprime) ----- */
    const renderDailyCount = (editable: boolean) => (
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>{editable ? t.count.title : t.count.readOnly}</Text>
        {editable && <Text style={styles.directionSubText}>{t.count.sub}</Text>}
        {CATALOG_CATEGORIES.map(cat => {
          const list = catalog.filter(c => c.category === cat && (editable || (todayCounts[c.id] || 0) > 0));
          if (!list.length) return null;
          return (
            <View key={cat} style={{ marginBottom: 8 }}>
              <Text style={styles.floorTitle}>{cat === 'towels' ? '🛁 ' : cat === 'sheets' ? '🛏️ ' : '📦 '}{t.cleaning[cat]}</Text>
              {list.map(c => (
                <View key={c.id} style={styles.counterRow}>
                  <Text style={styles.counterLabel}>{itemName(c)}</Text>
                  {editable ? (
                    <View style={styles.counterControls}>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => changeCount(c.id, -1)}><Text style={styles.counterBtnText}>-</Text></TouchableOpacity>
                      <Text style={styles.counterValue}>{todayCounts[c.id] || 0}</Text>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => changeCount(c.id, 1)}><Text style={styles.counterBtnText}>+</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.counterValue}>{todayCounts[c.id]}</Text>
                  )}
                </View>
              ))}
            </View>
          );
        })}
        {!editable && Object.values(todayCounts).every(v => !v) && <Text style={styles.emptyText}>{t.count.none}</Text>}
        <TouchableOpacity style={[styles.actionFeedButton, { backgroundColor: '#0F172A', marginTop: 8 }]} onPress={printDailyCount}>
          <Text style={styles.actionFeedButtonText}>{t.count.print}</Text>
        </TouchableOpacity>
      </View>
    );

    /* ----- Utensilios (Gobernante): catálogo compartido ----- */
    const renderInventory = () => (
      <View style={styles.feedCard}>
        <View style={styles.feedCardHeader}>
          <Text style={styles.feedCardTitle}>{t.inventory.title}</Text>
          <Text style={styles.feedCardSubtitle}>{t.inventory.sub}</Text>
        </View>

        {CATALOG_CATEGORIES.map(cat => (
          <View key={cat} style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>{cat === 'towels' ? '🛁 ' : cat === 'sheets' ? '🛏️ ' : '📦 '}{t.cleaning[cat]}</Text>
            {catalog.filter(c => c.category === cat).map(c => (
              <View key={c.id} style={styles.invRow}>
                <TextInput
                  key={`${c.id}-${itemName(c)}`}
                  style={styles.invInput}
                  defaultValue={itemName(c)}
                  onEndEditing={e => { const v = e.nativeEvent.text.trim(); if (v && v !== itemName(c)) updateCatalogItem(c.id, { name: v }); }}
                />
                {cat !== 'supplies' && (
                  <View style={styles.counterControls}>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => updateCatalogItem(c.id, { qty: Math.max(0, (c.qty || 0) - 1) })}>
                      <Text style={styles.counterBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{c.qty || 0}</Text>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => updateCatalogItem(c.id, { qty: (c.qty || 0) + 1 })}>
                      <Text style={styles.counterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity style={styles.deleteBtn} onPress={() => removeCatalogItem(c.id)}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
        <Text style={styles.directionSubText}>{t.inventory.qty}: +/−</Text>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{t.inventory.add}</Text>
          <TextInput style={styles.input} placeholder={t.inventory.newPH} placeholderTextColor="#64748B" value={newItemName} onChangeText={setNewItemName} />
          <View style={[styles.pillRow, { flexWrap: 'wrap' }]}>
            {CATALOG_CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} style={[styles.deptPill, newItemCategory === cat && styles.deptPillActive]} onPress={() => setNewItemCategory(cat)}>
                <Text style={[styles.deptPillText, newItemCategory === cat && styles.deptPillTextActive]} numberOfLines={1}>{t.cleaning[cat]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.actionFeedButton, { backgroundColor: '#5b21b6' }]} onPress={addCatalogItem}>
            <Text style={styles.actionFeedButtonText}>{t.inventory.add}</Text>
          </TouchableOpacity>
        </View>

        {renderDailyCount(false)}
      </View>
    );

    /* ----- Tareas asignadas al trabajador (verde cuando están hechas) ----- */
    const renderMyTasks = () => myDelegatedTasks.length > 0 && !isGoverness ? (
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>{t.dashboard.myTasksTitle}</Text>
        <View style={styles.tasksList}>
          {myDelegatedTasks.map(task => (
            <View key={task.id} style={[styles.taskRow, task.status === 'done' && styles.taskRowDone]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskText, task.status === 'done' && styles.taskTextDone]}>{task.taskText}</Text>
              </View>
              <TouchableOpacity
                style={[styles.taskStatusBtn, task.status === 'done' ? { backgroundColor: '#10B981' } : { backgroundColor: '#0284C7' }]}
                onPress={() => toggleTaskStatus(task)}
              >
                <Text style={styles.taskStatusText}>{task.status === 'done' ? t.dashboard.completed : t.dashboard.pending}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    ) : null;

    /* ----- Equipier: avisos de faltantes por planta (símbolo +) ----- */
    const renderEquipierRequests = () => {
      const mine = supplyRequests.filter(r => r.authorId === session.staffId);
      return (
        <View style={styles.sectionBox}>
          <View style={styles.titleWithPlus}>
            <Text style={[styles.sectionTitle, { flex: 1, marginBottom: 0 }]}>{t.supply.title}</Text>
            <PlusButton onPress={() => { setSupplyText(''); setSupplyModalVisible(true); }} />
          </View>
          <Text style={[styles.directionSubText, { marginTop: 6 }]}>{t.supply.sub}</Text>
          <Text style={styles.sectionTitle}>{t.supply.mine}</Text>
          {mine.length === 0 && <Text style={styles.emptyText}>{t.supply.empty}</Text>}
          <View style={styles.tasksList}>
            {mine.slice(0, 10).map(r => (
              <View key={r.id} style={[styles.taskRow, r.status === 'done' && styles.taskRowDone]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTargetBadge}>{t.supply.floor} {r.floor}</Text>
                  <Text style={styles.taskText}>{r.text}</Text>
                </View>
                <View style={[styles.taskStatusBtn, { backgroundColor: requestStatusColor(r.status) }]}>
                  <Text style={styles.taskStatusText}>{requestStatusLabel(r.status)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    };

    /* ----- Gobernante: faltantes avisados → crear tarea para el equipier ----- */
    const renderGovernessRequests = () => (
      <View style={{ marginTop: 18 }}>
        <Text style={styles.sectionTitle}>{t.supply.requestsTitle}</Text>
        {supplyRequests.length === 0 ? (
          <Text style={styles.emptyText}>{t.supply.empty}</Text>
        ) : (
          <View style={styles.tasksList}>
            {supplyRequests.slice(0, 15).map(r => (
              <View key={r.id} style={[styles.taskRow, r.status === 'done' && styles.taskRowDone]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTargetBadge}>{t.supply.floor} {r.floor} · {t.maintenance.from} {r.author}</Text>
                  <Text style={styles.taskText}>{r.text}</Text>
                </View>
                {r.status === 'open' ? (
                  <TouchableOpacity
                    style={[styles.taskStatusBtn, { backgroundColor: '#5b21b6' }]}
                    onPress={() => openTaskModal({ role: 'equipier', text: `${t.supply.taskPrefix} ${r.floor}: ${r.text}`, requestId: r.id })}
                  >
                    <Text style={styles.taskStatusText}>{t.supply.createTask}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.taskStatusBtn, { backgroundColor: requestStatusColor(r.status) }]}>
                    <Text style={styles.taskStatusText}>{requestStatusLabel(r.status)}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );

    /* ----- Gobernante: inspección y bloqueo, basada en el planning del día ----- */
    const renderInspection = () => (
      <View>
        <Text style={styles.sectionTitle}>{t.dashboard.inspectionTitle}</Text>
        {todayAssignments.length === 0 ? (
          <Text style={styles.emptyText}>{t.dashboard.inspectionEmpty}</Text>
        ) : (
          <View style={styles.roomsNotesList}>
            {todayAssignments.map(item => {
              const blocked = isRoomBlocked(item.room);
              const leftBorderColor = blocked ? '#DC2626' : TASK_TYPE_COLORS[item.taskType];
              const dotBg = blocked ? '#DC2626' : WORK_COLORS[item.workStatus];
              const linenText = summarizeLinen(item.linen);
              return (
                <View key={item.id} style={[styles.roomNoteRow, { borderLeftColor: leftBorderColor, backgroundColor: blocked ? '#FEF2F2' : '#FFFFFF' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                    <View style={[styles.statusDot, { marginTop: 4, backgroundColor: dotBg }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noteRoomNum}>
                        {t.common.room} {item.room} ({taskTypeLabel(item.taskType)}) {blocked ? t.dashboard.blockedTag : ''}
                      </Text>
                      <Text style={styles.guestNameText}>{t.dashboard.assignedTo}: {item.staffName}</Text>
                      {!!item.guestName && <Text style={styles.guestNameText}>{t.dashboard.guestLabel}{item.guestName}</Text>}
                      <Text style={styles.bedHistoryNormal}>{t.dashboard.cleaningLabel}{workLabel(item.workStatus)}</Text>
                      {!!linenText && <Text style={styles.bedHistoryAlert}>{t.dashboard.prevRecord}{linenText}</Text>}
                      {(item.notes || []).slice(-3).map(n => (
                        <View key={n.id} style={styles.noteBox}>
                          <Text style={styles.noteAuthor}>📝 {n.author}</Text>
                          <Text style={styles.noteText}>{n.text}</Text>
                        </View>
                      ))}
                      <Text style={styles.infoDailyText}>{item.taskType === 'daily' ? t.dashboard.dailyInfo : t.dashboard.inspectionInfo}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 10, gap: 6 }}>
                    <TouchableOpacity
                      style={[styles.blockBtn, blocked ? { backgroundColor: '#DC2626' } : { backgroundColor: '#475569' }]}
                      onPress={() => toggleRoomBlock(item.room)}
                    >
                      <Text style={styles.blockBtnText}>{blocked ? t.dashboard.unblock : t.dashboard.block}</Text>
                    </TouchableOpacity>
                    {item.taskType !== 'daily' && (
                      <TouchableOpacity
                        style={[styles.inspectBtn, item.inspected ? { backgroundColor: '#10B981' } : { backgroundColor: '#64748B' }]}
                        onPress={() => toggleInspection(item)}
                      >
                        <Text style={styles.inspectBtnText}>{item.inspected ? t.dashboard.approved : t.dashboard.inspect}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );

    /* ----- Limpieza: planning asignado por la gobernante o la recepción ----- */
    const renderCleaning = () => (
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>{t.dashboard.shiftTitle}</Text>
        <Text style={styles.shiftBadge}>
          👤 {t.common.staff}: <Text style={{ fontWeight: 'bold' }}>{currentName}</Text> | ⏰ {t.common.shift}: <Text style={{ color: '#0284C7', fontWeight: 'bold' }}>{todayShiftText}</Text>
        </Text>

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>{t.dashboard.assignedRoomsTitle}</Text>
        {myAssignments.length === 0 && <Text style={styles.emptyText}>{t.cleaningView.noAssignments}</Text>}
        <View style={styles.roomsNotesList}>
          {myAssignments.map(item => {
            const blocked = isRoomBlocked(item.room);
            return (
              <View key={item.id} style={[styles.roomNoteRow, { borderLeftColor: blocked ? '#DC2626' : TASK_TYPE_COLORS[item.taskType], backgroundColor: blocked ? '#FEF2F2' : '#FFFFFF' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                  <View style={[styles.statusDot, { marginTop: 4, backgroundColor: blocked ? '#DC2626' : WORK_COLORS[item.workStatus] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noteRoomNum}>{t.common.room} {item.room} {blocked ? t.dashboard.blockedTag : ''}</Text>
                    <Text style={styles.guestNameText}>{t.dashboard.guestLabel}{item.guestName || '—'}</Text>
                    <Text style={styles.bedHistoryNormal}>{t.dashboard.statusLabel}{workLabel(item.workStatus)}</Text>

                    {!blocked && (
                      <View style={{ marginTop: 6, gap: 8 }}>
                        <View>
                          <TouchableOpacity
                            style={[styles.workSelect, { backgroundColor: WORK_COLORS[item.workStatus] }]}
                            onPress={() => setOpenWorkMenu(openWorkMenu === item.id ? null : item.id)}
                          >
                            <Text style={styles.workSelectText}>{workLabel(item.workStatus)}  ▾</Text>
                          </TouchableOpacity>
                          {openWorkMenu === item.id && (
                            <View style={styles.workMenu}>
                              {WORK_KEYS.map(w => (
                                <TouchableOpacity
                                  key={w}
                                  style={[styles.workMenuItem, item.workStatus === w && styles.workMenuItemActive]}
                                  onPress={() => { changeWork(item, w); setOpenWorkMenu(null); }}
                                >
                                  <View style={[styles.workMenuDot, { backgroundColor: WORK_COLORS[w] }]} />
                                  <Text style={styles.workMenuText}>{workLabel(w)}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                        <TouchableOpacity style={styles.bedChangeBtn} onPress={() => { setNoteText(''); setInfoAssignmentId(item.id); }}>
                          <Text style={styles.bedChangeBtnText}>{t.cleaningView.moreInfo}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {blocked && <Text style={styles.blockedWarningText}>{t.dashboard.blockedWarning}</Text>}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                  <Text style={[styles.noteTaskBadge, { backgroundColor: TASK_TYPE_COLORS[item.taskType] }]}>{taskTypeLabel(item.taskType)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );

    const occupiedCount = rooms.filter(r => r.status === 'occupied' || r.status === 'daily').length;
    const occupancyPct = rooms.length ? Math.round((occupiedCount / rooms.length) * 100) : 0;
    const blockedCount = rooms.filter(r => r.status === 'blocked').length;
    const movementsCount = todayAssignments.filter(a => a.taskType !== 'daily').length;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.feedContainer} keyboardShouldPersistTaps="handled">
          {renderLangBar()}
          {renderOfflineBanner()}

          <View style={styles.socialHeader}>
            <View style={styles.userInfoRow}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: roleMeta?.color }]}>
                <Text style={styles.avatarText}>{(currentName || 'U').charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.profileName}>@{currentName}</Text>
                <Text style={styles.profileRole}>{t.common.role}{t.roles[roleKey]?.title}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButtonSmall}>
              <Text style={styles.logoutText}>{t.feed.logout}</Text>
            </TouchableOpacity>
          </View>

          {/* Línea verde pequeña: usuario en línea (gris si no hay red) */}
          <View style={[styles.onlineBar, showOffline && styles.onlineBarOff]}>
            <View style={[styles.onlineDot, showOffline && { backgroundColor: '#94A3B8' }]} />
            <Text style={[styles.onlineText, showOffline && { color: '#475569' }]}>{showOffline ? 'Offline' : t.feed.online}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={styles.tabsRow}>
            {tabs.map(tab => (
              <TouchableOpacity key={tab.id} style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]} onPress={() => setActiveViewMode(tab.id)}>
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activeTab === 'map' && renderMap()}
          {activeTab === 'assign' && canAssign && renderAssign()}
          {activeTab === 'planning' && renderPlanning()}
          {activeTab === 'staff' && renderStaff()}
          {activeTab === 'items' && renderInventory()}
          {activeTab === 'settings' && renderSettings()}

          {activeTab === 'dashboard' && (
            <View style={styles.feedCard}>
              <View style={styles.feedCardHeader}>
                <Text style={styles.feedCardTitle}>{t.roles[roleKey]?.title}</Text>
                <Text style={styles.feedCardSubtitle}>{t.feed.location}</Text>
              </View>

              {/* ===== DIRECCIÓN ===== */}
              {isDirection && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>{t.dashboard.directionTitle}</Text>
                  <Text style={styles.directionSubText}>{t.dashboard.directionSub}</Text>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricNum}>{occupancyPct}%</Text>
                      <Text style={styles.metricLabel}>{t.dashboard.occupancy}</Text>
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricNum}>{movementsCount}</Text>
                      <Text style={styles.metricLabel}>{t.dashboard.checkInOut}</Text>
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricNum}>{blockedCount}</Text>
                      <Text style={styles.metricLabel}>{t.dashboard.maintenanceIssues}</Text>
                    </View>
                  </View>
                  <View style={styles.generalStatusBox}>
                    <Text style={styles.generalStatusText}>{t.dashboard.opsStatus}</Text>
                  </View>
                </View>
              )}

              {/* ===== GOBERNANTE: 1) inspección y bloqueo, 2) tareas activas, 3) informes de mantenimiento ===== */}
              {isGoverness && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>{t.dashboard.governessTitle}</Text>
                  <Text style={styles.directionSubText}>{t.dashboard.governessSub}</Text>

                  {renderInspection()}

                  <View style={[styles.titleWithPlus, { marginTop: 18 }]}>
                    <Text style={[styles.sectionTitle, { flex: 1, marginBottom: 0 }]}>{t.dashboard.activeTasksTitle}</Text>
                    <PlusButton onPress={() => openTaskModal()} />
                  </View>

                  <View style={[styles.tasksList, { marginTop: 8 }]}>
                    {governessTasks.map(task => (
                      <View key={task.id} style={[styles.taskRow, task.status === 'done' && styles.taskRowDone]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.taskTargetBadge}>
                            {t.common.for}: {task.targetName ? `${task.targetName} · ` : ''}{t.roles[task.targetRole]?.title}
                          </Text>
                          <Text style={[styles.taskText, task.status === 'done' && styles.taskTextDone]}>{task.taskText}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.taskStatusBtn, task.status === 'done' ? { backgroundColor: '#10B981' } : { backgroundColor: '#5b21b6' }]}
                          onPress={() => toggleTaskStatus(task)}
                        >
                          <Text style={styles.taskStatusText}>{task.status === 'done' ? t.dashboard.completed : t.dashboard.pending}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  {renderGovernessRequests()}

                  <Text style={[styles.sectionTitle, { marginTop: 18 }]}>{t.maintenance.reportsTitle}</Text>
                  {reports.length === 0 ? (
                    <Text style={styles.emptyText}>{t.maintenance.reportsEmpty}</Text>
                  ) : (
                    <View style={styles.tasksList}>
                      {reports.slice(0, 15).map(rp => (
                        <View key={rp.id} style={styles.taskRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.taskTargetBadge}>{t.common.room} {rp.room} · {t.maintenance.from} {rp.author}</Text>
                            <Text style={styles.taskText}>{rp.text}</Text>
                            <Text style={styles.bedHistoryNormal}>{new Date(rp.date).toLocaleString()}</Text>
                          </View>
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => removeReport(rp.id)}>
                            <Text style={styles.deleteBtnText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* ===== LIMPIEZA ===== */}
              {roleKey === 'cleaning' && renderCleaning()}

              {/* ===== MANTENIMIENTO ===== */}
              {roleKey === 'maintenance' && (
                <View style={styles.sectionBox}>
                  <View style={styles.titleWithPlus}>
                    <Text style={[styles.sectionTitle, { flex: 1, marginBottom: 0 }]}>{t.maintenance.title}</Text>
                    <PlusButton onPress={() => setShowRoomPicker(v => !v)} />
                  </View>
                  <Text style={[styles.directionSubText, { marginTop: 6 }]}>{t.maintenance.sub}</Text>

                  {showRoomPicker && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.sectionTitle}>{t.maintenance.roomsList}</Text>
                      {FLOORS.map(fl => (
                        <View key={fl.f} style={styles.floorSectionBox}>
                          <Text style={styles.floorTitle}>🏢 {t.mapView.floor}: {fl.f}</Text>
                          <View style={styles.circleGrid}>
                            {fl.ids.map(id => (
                              <View key={id} style={styles.roomChip}>
                                <Text style={styles.roomChipText}>{id}</Text>
                                <TouchableOpacity style={styles.roomChipPlus} onPress={() => { setReportText(''); setReportModalRoom(id); }}>
                                  <Text style={styles.roomChipPlusText}>+</Text>
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={styles.sectionTitle}>{t.maintenance.blockedTitle}</Text>
                  {rooms.filter(r => r.status === 'blocked').length === 0 && <Text style={styles.emptyText}>{t.maintenance.noBlocked}</Text>}
                  <View style={styles.roomsNotesList}>
                    {rooms.filter(r => r.status === 'blocked').map(r => (
                      <View key={r.id} style={[styles.roomNoteRow, { borderLeftColor: '#DC2626' }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.noteRoomNum}>{t.common.room} {r.id}</Text>
                          <Text style={styles.guestNameText}>{t.dashboard.statusLabel}{t.dashboard.blockedTag}</Text>
                        </View>
                        <TouchableOpacity style={styles.unlockBtn} onPress={() => toggleRoomBlock(r.id)}>
                          <Text style={styles.unlockBtnText}>{t.dashboard.resolveUnlock}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* ===== EQUIPIER: avisos de faltantes (+), tareas y conteo del día con impresión ===== */}
              {roleKey === 'equipier' && renderEquipierRequests()}

              {renderMyTasks()}

              {roleKey === 'equipier' && renderDailyCount(true)}
            </View>
          )}
        </ScrollView>

        {/* ===== MODAL: cambiar estado de habitación (plano) ===== */}
        <Modal visible={!!statusModalRoom} animationType="fade" transparent={true} onRequestClose={() => setStatusModalRoom(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t.mapView.changeTitle} · {t.common.room} {statusModalRoom?.id}</Text>
              <View style={{ marginVertical: 10, gap: 6 }}>
                {STATUS_KEYS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.workMenuItem, statusModalRoom?.status === s && styles.workMenuItemActive]}
                    onPress={() => { applyRoomStatus(statusModalRoom.id, s); setStatusModalRoom(null); }}
                  >
                    <View style={[styles.legendDot, { backgroundColor: statusColor(s, isDirection), borderColor: s === 'daily' ? '#94A3B8' : statusColor(s, isDirection) }]} />
                    <Text style={styles.workMenuText}>{t.mapView.status[s]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#64748B' }]} onPress={() => setStatusModalRoom(null)}>
                <Text style={styles.modalCloseText}>{t.common.cancel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ===== MODAL: nueva tarea ===== */}
        <Modal visible={newTaskModalVisible} animationType="slide" transparent={true} onRequestClose={() => setNewTaskModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t.tasks.newTitle}</Text>

              <Text style={styles.inputLabel}>{t.tasks.dept}</Text>
              <View style={styles.pillRow}>
                {TASK_ROLES.map(r => (
                  <TouchableOpacity key={r} style={[styles.deptPill, selectedTargetRole === r && styles.deptPillActive]} onPress={() => pickTaskRole(r)}>
                    <Text style={[styles.deptPillText, selectedTargetRole === r && styles.deptPillTextActive]} numberOfLines={1}>{t.roles[r].title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>{t.tasks.person}</Text>
              {staff.filter(s => s.role === selectedTargetRole).length === 0 ? (
                <Text style={[styles.emptyText, { marginBottom: 12 }]}>{t.tasks.noPeople}</Text>
              ) : (
                <View style={[styles.pillRow, { flexWrap: 'wrap' }]}>
                  {staff.filter(s => s.role === selectedTargetRole).map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.personChip, selectedTargetStaff === s.id && styles.personChipActive]}
                      onPress={() => setSelectedTargetStaff(s.id)}
                    >
                      <Text style={[styles.deptPillText, selectedTargetStaff === s.id && styles.deptPillTextActive]}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>{t.tasks.message}</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder={t.tasks.placeholder}
                placeholderTextColor="#64748B"
                multiline
                value={newTaskText}
                onChangeText={setNewTaskText}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#64748B', flex: 1 }]} onPress={() => setNewTaskModalVisible(false)}>
                  <Text style={styles.modalCloseText}>{t.common.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#5b21b6', flex: 1 }]} onPress={handleGovernessTask}>
                  <Text style={styles.modalCloseText}>{t.tasks.assign}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ===== MODAL: toallas / sábanas ===== */}
        <Modal visible={!!linenModal} animationType="slide" transparent={true} onRequestClose={() => setLinenModal(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalLinenContent}>
              {linenModal && (
                <>
                  <Text style={styles.modalTitle}>
                    {linenModal.category === 'towels' ? '🛁 ' + t.cleaning.towels : '🛏️ ' + t.cleaning.sheets} · {t.common.room} {linenModal.item.room}
                  </Text>
                  <Text style={styles.modalSubTitle}>{t.cleaning.removedSub}</Text>
                  <ScrollView style={{ maxHeight: 360, marginVertical: 10 }}>
                    {catalog.filter(c => c.category === linenModal.category).map(c => (
                      <View key={c.id} style={styles.counterRow}>
                        <Text style={styles.counterLabel}>{itemName(c)}</Text>
                        <View style={styles.counterControls}>
                          <TouchableOpacity style={styles.counterBtn} onPress={() => updateLinenCount(c.id, -1)}>
                            <Text style={styles.counterBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.counterValue}>{linenForm[c.id] || 0}</Text>
                          <TouchableOpacity style={styles.counterBtn} onPress={() => updateLinenCount(c.id, 1)}>
                            <Text style={styles.counterBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#64748B', flex: 1 }]} onPress={() => setLinenModal(null)}>
                      <Text style={styles.modalCloseText}>{t.common.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#047857', flex: 1 }]} onPress={saveLinen}>
                      <Text style={styles.modalCloseText}>{t.common.save}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* ===== MODAL: informe de mantenimiento ===== */}
        <Modal visible={!!reportModalRoom} animationType="slide" transparent={true} onRequestClose={() => setReportModalRoom(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🔧 {t.maintenance.addReport} · {t.common.room} {reportModalRoom}</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top', marginTop: 10 }]}
                placeholder={t.maintenance.reportPH}
                placeholderTextColor="#64748B"
                multiline
                value={reportText}
                onChangeText={setReportText}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#64748B', flex: 1 }]} onPress={() => setReportModalRoom(null)}>
                  <Text style={styles.modalCloseText}>{t.common.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#D97706', flex: 1 }]} onPress={submitReport}>
                  <Text style={styles.modalCloseText}>{t.maintenance.send}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ===== MODAL: editar horario escrito ===== */}
        <Modal visible={!!shiftEdit} animationType="slide" transparent={true} onRequestClose={() => setShiftEdit(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🕒 {t.planningEdit.title}</Text>
              <Text style={styles.modalSubTitle}>{shiftEdit?.name} · {shiftEdit?.key}</Text>

              <Text style={styles.inputLabel}>{t.planningEdit.label}</Text>
              <TextInput
                style={styles.input} placeholder={t.planningEdit.ph} placeholderTextColor="#64748B"
                autoCorrect={false} value={shiftEdit?.text || ''}
                onChangeText={v => setShiftEdit(prev => (prev ? { ...prev, text: v } : prev))}
              />
              <View style={[styles.pillRow, { flexWrap: 'wrap' }]}>
                {['07:00-15:30', '12:00-20:30', t.planning.off, t.planning.leave].map(p => (
                  <TouchableOpacity key={p} style={styles.presetChip} onPress={() => setShiftEdit(prev => (prev ? { ...prev, text: p } : prev))}>
                    <Text style={styles.presetChipText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.directionSubText}>{t.planningEdit.hint}</Text>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#64748B', flex: 1 }]} onPress={() => setShiftEdit(null)}>
                  <Text style={styles.modalCloseText}>{t.common.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#DC2626', flex: 1 }]} onPress={clearShift}>
                  <Text style={styles.modalCloseText}>{t.planningEdit.clear}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#0284C7', flex: 1 }]} onPress={saveShift}>
                  <Text style={styles.modalCloseText}>{t.common.save}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ===== MODAL: aviso de faltantes por planta (equipier) ===== */}
        <Modal visible={supplyModalVisible} animationType="slide" transparent={true} onRequestClose={() => setSupplyModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t.supply.title}</Text>

              <Text style={[styles.inputLabel, { marginTop: 8 }]}>{t.supply.floor}</Text>
              <View style={[styles.pillRow, { flexWrap: 'wrap' }]}>
                {FLOORS.map(fl => (
                  <TouchableOpacity key={fl.f} style={[styles.personChip, supplyFloor === fl.f && styles.personChipActive]} onPress={() => setSupplyFloor(fl.f)}>
                    <Text style={[styles.deptPillText, supplyFloor === fl.f && styles.deptPillTextActive]}>{fl.f}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                placeholder={t.supply.textPH} placeholderTextColor="#64748B" multiline
                value={supplyText} onChangeText={setSupplyText}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#64748B', flex: 1 }]} onPress={() => setSupplyModalVisible(false)}>
                  <Text style={styles.modalCloseText}>{t.common.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#b45309', flex: 1 }]} onPress={submitSupplyRequest}>
                  <Text style={styles.modalCloseText}>{t.supply.add}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ===== MODAL: más información de la habitación (limpieza) ===== */}
        <Modal visible={!!infoAssignment} animationType="slide" transparent={true} onRequestClose={() => setInfoAssignmentId(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalLinenContent}>
              {infoAssignment && (
                <>
                  <Text style={styles.modalTitle}>ℹ️ {t.cleaningView.infoTitle} · {t.common.room} {infoAssignment.room}</Text>
                  <ScrollView style={{ maxHeight: 440, marginVertical: 8 }} keyboardShouldPersistTaps="handled">
                    <Text style={styles.guestNameText}>{t.dashboard.guestLabel}{infoAssignment.guestName || '—'}</Text>
                    <Text style={styles.guestNameText}>{t.cleaningView.service}: {taskTypeLabel(infoAssignment.taskType)}</Text>
                    <Text style={styles.guestNameText}>{t.dashboard.statusLabel}{workLabel(infoAssignment.workStatus)}</Text>

                    <Text style={[styles.sectionTitle, { marginTop: 12 }]}>{t.cleaningView.linenDetail}</Text>
                    <Text style={styles.guestNameText}>🛁 {summarizeLinen(infoAssignment.linen, ['towels']) || t.cleaningView.noLinenInfo}</Text>
                    <Text style={styles.guestNameText}>🛏️ {summarizeLinen(infoAssignment.linen, ['sheets']) || t.cleaningView.noLinenInfo}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <TouchableOpacity style={styles.bedChangeBtn} onPress={() => { const a = infoAssignment; setInfoAssignmentId(null); openLinen(a, 'towels'); }}>
                        <Text style={styles.bedChangeBtnText}>🛁 {t.cleaning.towels}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.bedChangeBtn} onPress={() => { const a = infoAssignment; setInfoAssignmentId(null); openLinen(a, 'sheets'); }}>
                        <Text style={styles.bedChangeBtnText}>🛏️ {t.cleaning.sheets}</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{t.cleaningView.notes}</Text>
                    {(infoAssignment.notes || []).length === 0 && <Text style={styles.emptyText}>{t.cleaningView.noNotes}</Text>}
                    {(infoAssignment.notes || []).map(n => (
                      <View key={n.id} style={styles.noteBox}>
                        <Text style={styles.noteAuthor}>{n.author} · {new Date(n.date).toLocaleString()}</Text>
                        <Text style={styles.noteText}>{n.text}</Text>
                      </View>
                    ))}

                    <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{t.cleaningView.addNote}</Text>
                    <TextInput
                      style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                      placeholder={t.cleaningView.notePH} placeholderTextColor="#64748B" multiline
                      value={noteText} onChangeText={setNoteText}
                    />
                    <TouchableOpacity style={[styles.actionFeedButton, { backgroundColor: '#D97706' }]} onPress={submitNote}>
                      <Text style={styles.actionFeedButtonText}>{t.cleaningView.sendNote}</Text>
                    </TouchableOpacity>
                  </ScrollView>
                  <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#64748B' }]} onPress={() => setInfoAssignmentId(null)}>
                    <Text style={styles.modalCloseText}>{t.cleaningView.close}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {renderConfirmModal()}
        {renderPinResetModal()}
        {renderLegalModals()}
      </SafeAreaView>
    );
  }

  /* ============================================================
     2) MENÚ DE PERFILES
     ============================================================ */
  if (!selectedRole) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {renderLangBar()}
          {renderOfflineBanner()}

          <View style={styles.headerFeed}>
            <Text style={styles.appTitle}>{t.appTitle}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>

          <View style={styles.cardsGrid}>
            {rolesList.map(role => {
              const info = t.roles[role.id] || {};
              return (
                <TouchableOpacity
                  key={role.id}
                  style={[styles.socialCard, { borderColor: role.color + '50' }]}
                  onPress={() => { setPin(''); setUsername(''); setPendingStaff(null); setSelectedRole(role.id); }}
                >
                  <View style={[styles.cardTopBadge, { backgroundColor: role.color + '15' }]}>
                    <Text style={styles.cardBadgeIcon}>{role.icon}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{info.title}</Text>
                    <Text style={styles.cardSubtitle}>{info.subtitle}</Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardActionText, { color: role.color }]}>{t.enter}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footerNav}>
            <TouchableOpacity onPress={() => setHelpModalVisible(true)} style={styles.footerLinkButton}>
              <Text style={styles.footerLinkText}>{t.footerLinks.help}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTermsModalVisible(true)} style={styles.footerLinkButton}>
              <Text style={styles.footerLinkText}>{t.footerLinks.terms}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPrivacyModalVisible(true)} style={styles.footerLinkButton}>
              <Text style={styles.footerLinkText}>{t.footer.privacy}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {renderLegalModals()}
      </SafeAreaView>
    );
  }

  /* ============================================================
     3) ACCESO DEL PERFIL SELECCIONADO
     ============================================================ */
  const currentRoleObj = rolesList.find(r => r.id === selectedRole);
  const currentRoleInfo = t.roles[selectedRole] || {};
  const roleStaff = staff.filter(s => s.role === selectedRole);
  const isStaffProfile = STAFF_ROLES.includes(selectedRole);
  const isReceptionLogin = selectedRole === 'reception';
  const isDirectionLogin = selectedRole === 'direction';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
        {renderLangBar()}
        {renderOfflineBanner()}

        <View style={[styles.loginHeaderBadge, { backgroundColor: currentRoleObj?.color }]}>
          <Text style={styles.loginBadgeText}>{currentRoleObj?.icon} {currentRoleInfo?.title}</Text>
        </View>

        <Text style={styles.welcomeText}>{t.login.welcome}</Text>

        {isStaffProfile ? (
          pendingStaff ? (
            <>
              <Text style={styles.loginSub}>{t.login.pinFor} {pendingStaff.name}</Text>
              <Text style={styles.inputLabel}>{t.login.pinLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder="••••"
                placeholderTextColor="#64748B"
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                autoFocus
                value={pin}
                onChangeText={v => setPin(v.replace(/\D/g, ''))}
                onSubmitEditing={handleStaffPin}
              />
              <TouchableOpacity style={[styles.loginButton, { backgroundColor: currentRoleObj?.color }]} onPress={handleStaffPin}>
                <Text style={styles.loginButtonText}>{t.login.btn}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openPinReset({ kind: 'staffForgot', staff: pendingStaff })}>
                <Text style={styles.linkText}>{t.pinReset.forgot}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backButton} onPress={() => { setPendingStaff(null); setPin(''); }}>
                <Text style={styles.backButtonText}>{t.login.back}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.loginSub}>{t.login.pickName}</Text>
              {!staffCol.ready ? (
                <ActivityIndicator color={currentRoleObj?.color} style={{ marginBottom: 16 }} />
              ) : roleStaff.length === 0 ? (
                <Text style={[styles.emptyText, { textAlign: 'center', marginBottom: 16 }]}>{t.login.noStaff}</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {roleStaff.map(s => (
                    <TouchableOpacity key={s.id} style={[styles.employeeBtn, { borderColor: currentRoleObj?.color }]} onPress={() => { setPin(''); setPendingStaff(s); }}>
                      <View style={[styles.avatarPlaceholder, { backgroundColor: currentRoleObj?.color }]}>
                        <Text style={styles.avatarText}>{s.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.employeeName}>{s.name}</Text>
                      <Text style={[styles.employeeArrow, { color: currentRoleObj?.color }]}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.backButton} onPress={() => setSelectedRole(null)}>
                <Text style={styles.backButtonText}>{t.login.back}</Text>
              </TouchableOpacity>
            </>
          )
        ) : (
          <>
            <Text style={styles.loginSub}>{t.login.sub}</Text>

            {isReceptionLogin ? (
              <View style={styles.hintBox}><Text style={styles.hintText}>{t.login.receptionUser}</Text></View>
            ) : (
              <>
                <Text style={styles.inputLabel}>{t.login.userLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.login.userPlaceholder}
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={setUsername}
                />
              </>
            )}

            <Text style={styles.inputLabel}>{t.login.pinLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder="••••"
              placeholderTextColor="#64748B"
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              value={pin}
              onChangeText={v => setPin(v.replace(/\D/g, ''))}
              onSubmitEditing={handleLogin}
            />

            {isDirectionLogin && needsContact && (
              <>
                <Text style={styles.inputLabel}>{t.pinReset.directionContactLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.pinReset.contactPH}
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={contact}
                  onChangeText={setContact}
                />
              </>
            )}

            <Text style={[styles.emptyText, { marginBottom: 8 }]}>{t.login.firstSetup}</Text>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: currentRoleObj?.color, opacity: loginBusy ? 0.6 : 1 }]}
              onPress={handleLogin}
              disabled={loginBusy}
            >
              {loginBusy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginButtonText}>{t.login.btn}</Text>}
            </TouchableOpacity>

            {isDirectionLogin && (
              <TouchableOpacity onPress={() => openPinReset({ kind: 'directionForgot' })}>
                <Text style={styles.linkText}>{t.pinReset.forgot}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.backButton} onPress={() => setSelectedRole(null)}>
              <Text style={styles.backButtonText}>{t.login.back}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {renderPinResetModal()}
    </SafeAreaView>
  );
}

/* ============================================================
   ESTILOS
   ============================================================ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F2FE' },
  centerBox: { justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { padding: 12, maxWidth: 850, alignSelf: 'center', width: '100%' },

  langBar: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  langChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BAE6FD' },
  langChipActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  langChipText: { fontSize: 11, fontWeight: 'bold', color: '#0369A1' },
  langChipTextActive: { color: '#FFFFFF' },

  // Aviso sin conexión
  offlineBar: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D', borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10 },
  offlineBarError: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  offlineText: { fontSize: 12, color: '#78350F', fontWeight: '600', textAlign: 'center' },

  headerFeed: { marginBottom: 12, alignItems: 'center', marginTop: 2 },
  appTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 12.5, color: '#334155', marginTop: 4, textAlign: 'center', fontWeight: '500' },

  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  socialCard: { backgroundColor: '#FFFFFF', borderRadius: 14, width: '48%', borderWidth: 1.2, overflow: 'hidden', shadowColor: '#0284C7', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, marginBottom: 8 },

  cardTopBadge: { height: 75, justifyContent: 'center', alignItems: 'center' },
  cardBadgeIcon: { fontSize: 36 },

  cardBody: { padding: 12, minHeight: 80 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#475569', lineHeight: 16 },
  cardFooter: { paddingHorizontal: 12, paddingBottom: 12 },
  cardActionText: { fontSize: 12.5, fontWeight: '700' },

  footerNav: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 15, paddingBottom: 15 },
  footerLinkButton: { padding: 6 },
  footerLinkText: { fontSize: 12, fontWeight: '600', color: '#0284C7' },

  // Pestañas
  tabsRow: { gap: 6, paddingRight: 6 },
  tabBtn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BAE6FD' },
  tabBtnActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  tabText: { fontSize: 12.5, fontWeight: 'bold', color: '#334155' },
  tabTextActive: { color: '#FFFFFF' },

  // Barra en línea
  onlineBar: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#DCFCE7', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10, marginBottom: 12, borderWidth: 1, borderColor: '#86EFAC' },
  onlineBarOff: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' },
  onlineText: { fontSize: 10.5, fontWeight: '700', color: '#166534' },

  // Toggle general / activa
  viewToggleContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 10, padding: 4, marginBottom: 12 },
  viewToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  viewToggleBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  viewToggleText: { fontSize: 12.5, fontWeight: 'bold', color: '#475569' },
  viewToggleTextActive: { color: '#0F172A' },

  // Plano y círculos
  floorSectionBox: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#CBD5E1' },
  floorTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  circleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roomCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  roomCircleText: { fontSize: 11, fontWeight: 'bold' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  legendText: { fontSize: 11, color: '#334155', fontWeight: '600' },
  statusHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  statusHeaderText: { fontSize: 12.5, fontWeight: '700', color: '#1E293B' },
  emptyText: { fontSize: 12, color: '#64748B', fontStyle: 'italic' },

  // Modales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 15 },
  modalContent: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 14, width: '100%', maxWidth: 450, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  modalLinenContent: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 14, width: '100%', maxWidth: 500, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  modalSubTitle: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  modalBody: { fontSize: 13.5, color: '#334155', marginVertical: 8 },
  modalCloseBtn: { padding: 10, borderRadius: 8, alignItems: 'center' },
  modalCloseText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  termsClause: { fontSize: 13, color: '#334155', lineHeight: 19, marginBottom: 10 },

  // Pills y chips
  pillRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  deptPill: { flex: 1, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
  deptPillActive: { backgroundColor: '#5b21b6', borderColor: '#5b21b6' },
  deptPillText: { fontSize: 11, fontWeight: 'bold', color: '#334155' },
  deptPillTextActive: { color: '#FFFFFF' },
  personChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  personChipActive: { backgroundColor: '#5b21b6', borderColor: '#5b21b6' },

  // Contadores
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  counterLabel: { fontSize: 12.5, color: '#1E293B', flex: 1, fontWeight: '500' },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterBtn: { width: 28, height: 28, backgroundColor: '#0284C7', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  counterValue: { fontSize: 15, fontWeight: 'bold', color: '#0F172A', minWidth: 20, textAlign: 'center' },

  // Botón +
  plusBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#5b21b6', justifyContent: 'center', alignItems: 'center', shadowColor: '#5b21b6', shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  plusBtnText: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginTop: -2 },
  titleWithPlus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },

  // Mantenimiento: chips de habitación con +
  roomChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 4, paddingLeft: 10, paddingRight: 4 },
  roomChipText: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  roomChipPlus: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#D97706', justifyContent: 'center', alignItems: 'center' },
  roomChipPlusText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginTop: -2 },

  // Selector de estado de trabajo (lista de tres)
  workSelect: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  workSelectText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: 'bold' },
  workMenu: { marginTop: 4, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', overflow: 'hidden', alignSelf: 'flex-start', minWidth: 170 },
  workMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 6 },
  workMenuItemActive: { backgroundColor: '#E0F2FE' },
  workMenuDot: { width: 12, height: 12, borderRadius: 6 },
  workMenuText: { fontSize: 12.5, color: '#0F172A', fontWeight: '600' },

  // Acceso
  formContainer: { padding: 20, maxWidth: 400, alignSelf: 'center', width: '100%', justifyContent: 'center', flexGrow: 1 },
  loginHeaderBadge: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, alignSelf: 'center', marginBottom: 16 },
  loginBadgeText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 4 },
  loginSub: { fontSize: 12, color: '#334155', textAlign: 'center', marginBottom: 20, fontWeight: '500' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  input: { backgroundColor: '#FFFFFF', color: '#0F172A', padding: 12, borderRadius: 10, fontSize: 14, marginBottom: 16, borderWidth: 1, borderColor: '#BAE6FD' },
  loginButton: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  loginButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  backButton: { marginTop: 16, alignItems: 'center' },
  backButtonText: { color: '#0284C7', fontSize: 13, fontWeight: '700' },
  employeeBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1.2 },
  employeeName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  employeeArrow: { fontSize: 26, fontWeight: 'bold' },

  // Ayudas / avisos informativos
  hintBox: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12 },
  hintText: { fontSize: 12, color: '#1E3A8A', lineHeight: 17 },

  // Ajustes
  settingsLink: { paddingVertical: 11, paddingHorizontal: 12, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 6 },
  settingsLinkText: { fontSize: 13.5, fontWeight: '600', color: '#0F172A' },

  // Feed
  feedContainer: { padding: 12, maxWidth: 650, alignSelf: 'center', width: '100%' },
  socialHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#BAE6FD', shadowColor: '#0284C7', shadowOpacity: 0.06, shadowRadius: 6 },
  userInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarPlaceholder: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  profileName: { fontSize: 14.5, fontWeight: 'bold', color: '#0F172A' },
  profileRole: { fontSize: 12, color: '#475569' },
  logoutButtonSmall: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FEE2E2', borderRadius: 6 },
  logoutText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },

  feedCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#BAE6FD', shadowColor: '#0284C7', shadowOpacity: 0.06, shadowRadius: 6 },
  feedCardHeader: { marginBottom: 12 },
  feedCardTitle: { fontSize: 16.5, fontWeight: 'bold', color: '#0F172A' },
  feedCardSubtitle: { fontSize: 12, color: '#475569', marginTop: 2, marginBottom: 8 },

  sectionBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 6 },
  directionSubText: { fontSize: 11.5, color: '#64748B', marginBottom: 10 },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  metricCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  metricNum: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  metricLabel: { fontSize: 10, color: '#475569', marginTop: 2, textAlign: 'center' },
  generalStatusBox: { backgroundColor: '#ECFDF5', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0' },
  generalStatusText: { fontSize: 12, color: '#065F46', fontWeight: '600', textAlign: 'center' },

  shiftBadge: { fontSize: 12.5, color: '#334155', marginBottom: 10 },

  roomsNotesList: { gap: 8 },
  roomNoteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', borderLeftWidth: 5 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  noteRoomNum: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  guestNameText: { fontSize: 12, color: '#334155', marginTop: 2 },
  bedHistoryAlert: { fontSize: 11, color: '#D97706', marginTop: 3, fontWeight: 'bold' },
  bedHistoryNormal: { fontSize: 11, color: '#64748B', marginTop: 3 },
  infoDailyText: { fontSize: 10.5, color: '#0284C7', marginTop: 2, fontWeight: '600' },
  blockedWarningText: { fontSize: 10.5, color: '#DC2626', marginTop: 4, fontWeight: 'bold' },

  bedChangeBtn: { backgroundColor: '#E0F2FE', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#BAE6FD' },
  bedChangeBtnText: { fontSize: 11.5, color: '#0369A1', fontWeight: 'bold' },

  inspectBtn: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6 },
  inspectBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  blockBtn: { paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6, backgroundColor: '#DC2626' },
  blockBtnText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: 'bold' },
  unlockBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#10B981' },
  unlockBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  deleteBtnText: { color: '#DC2626', fontSize: 13, fontWeight: 'bold' },
  editIconBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  editIconText: { fontSize: 13 },

  noteTaskBadge: { color: '#FFFFFF', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, fontSize: 11, fontWeight: 'bold', overflow: 'hidden' },

  tasksList: { gap: 6 },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  taskRowDone: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  taskTargetBadge: { fontSize: 10, fontWeight: 'bold', color: '#5b21b6', marginBottom: 2 },
  taskText: { fontSize: 12.5, color: '#0F172A', lineHeight: 16 },
  taskTextDone: { textDecorationLine: 'line-through', color: '#065F46' },
  taskStatusBtn: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 10 },
  taskStatusText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: 'bold' },

  actionFeedButton: { padding: 12, borderRadius: 10, alignItems: 'center' },
  actionFeedButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },

  // Planning
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthArrow: { width: 38, height: 34, borderRadius: 8, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' },
  monthArrowText: { fontSize: 14, color: '#0369A1', fontWeight: 'bold' },
  monthLabel: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  weekPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  weekPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  weekPillActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  weekPillText: { fontSize: 12, fontWeight: 'bold', color: '#334155' },
  weekPillTextActive: { color: '#FFFFFF' },
  planRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  planNameCell: { width: 84, paddingRight: 4 },
  planNameText: { fontSize: 12.5, fontWeight: 'bold', color: '#0F172A' },
  planRoleText: { fontSize: 9.5, color: '#64748B' },
  planHeadCell: { width: 74, alignItems: 'center', paddingVertical: 3, marginHorizontal: 1, borderRadius: 6 },
  planHeadToday: { backgroundColor: '#FEF3C7' },
  planHeadDay: { fontSize: 10, fontWeight: 'bold', color: '#475569' },
  planHeadNum: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  planCell: { width: 74, height: 44, marginHorizontal: 1, borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 2 },
  planCellText: { fontSize: 10.5, fontWeight: '600', color: '#0F172A', textAlign: 'center' },
  planHoursCell: { width: 36, alignItems: 'center' },
  planHoursText: { fontSize: 11.5, fontWeight: 'bold', color: '#0F172A' },

  // Asignación, notas, peticiones
  statusPill: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, marginTop: 4 },
  statusPillText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: 'bold' },
  noteBox: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 6 },
  noteAuthor: { fontSize: 10, fontWeight: 'bold', color: '#92400E' },
  noteText: { fontSize: 12, color: '#451A03', marginTop: 1 },
  guestInput: { backgroundColor: '#FFFFFF', color: '#0F172A', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, fontSize: 12, borderWidth: 1, borderColor: '#CBD5E1', marginTop: 4, minWidth: 140 },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  linkText: { color: '#0284C7', fontSize: 12.5, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  presetChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#BAE6FD' },
  presetChipText: { fontSize: 11.5, fontWeight: 'bold', color: '#0369A1' },

  // Utensilios
  invRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  invInput: { flex: 1, backgroundColor: '#FFFFFF', color: '#0F172A', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, fontSize: 12.5, borderWidth: 1, borderColor: '#CBD5E1' },
});
