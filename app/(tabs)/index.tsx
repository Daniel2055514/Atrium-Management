import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

/* ============================================================
   TRADUCCIONES (ES · FR · EN · IT · PT · RU · UK)
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
      dailyInfo: 'ℹ️ Servicio diario: no requiere inspección.', inspectionInfo: '🔍 Requiere inspección de salida/entrada.',
      guestLabel: 'Cliente: ', cleaningLabel: 'Limpieza: ', statusLabel: 'Estado: ',
      taskTypes: { inOut: 'Entrada y salida', daily: 'Servicio diario', out: 'Salida' },
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
        occupied: 'Ocupada', daily: 'Servicio diario', blocked: 'Bloqueada / Avería'
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
      dailyInfo: 'ℹ️ Service quotidien : pas d’inspection requise.', inspectionInfo: '🔍 Nécessite une inspection de départ/arrivée.',
      guestLabel: 'Client : ', cleaningLabel: 'Nettoyage : ', statusLabel: 'Statut : ',
      taskTypes: { inOut: 'Arrivée et départ', daily: 'Service quotidien', out: 'Départ' },
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
        occupied: 'Occupée', daily: 'Service quotidien', blocked: 'Bloquée / Panne'
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
      dailyInfo: 'ℹ️ Daily service: no inspection required.', inspectionInfo: '🔍 Requires check-out/check-in inspection.',
      guestLabel: 'Guest: ', cleaningLabel: 'Cleaning: ', statusLabel: 'Status: ',
      taskTypes: { inOut: 'Check-out and check-in', daily: 'Daily service', out: 'Check-out' },
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
        occupied: 'Occupied', daily: 'Daily service', blocked: 'Blocked / Out of order'
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
      dailyInfo: 'ℹ️ Servizio giornaliero: nessuna ispezione richiesta.', inspectionInfo: '🔍 Richiede ispezione di partenza/arrivo.',
      guestLabel: 'Ospite: ', cleaningLabel: 'Pulizia: ', statusLabel: 'Stato: ',
      taskTypes: { inOut: 'Partenza e arrivo', daily: 'Servizio giornaliero', out: 'Partenza' },
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
        occupied: 'Occupata', daily: 'Servizio giornaliero', blocked: 'Bloccata / Guasto'
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
      dailyInfo: 'ℹ️ Serviço diário: não requer inspeção.', inspectionInfo: '🔍 Requer inspeção de saída/entrada.',
      guestLabel: 'Hóspede: ', cleaningLabel: 'Limpeza: ', statusLabel: 'Status: ',
      taskTypes: { inOut: 'Saída e entrada', daily: 'Serviço diário', out: 'Saída' },
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
        occupied: 'Ocupado', daily: 'Serviço diário', blocked: 'Bloqueado / Avaria'
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
   CONSTANTES Y DATOS INICIALES
   ============================================================ */
const HOTEL_STORAGE_KEY = '@hotel_app_data_riviera';

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
  checkout: '#10B981', // verde
  cleaning: '#FACC15', // amarillo
  ready: '#0EA5E9',    // azul
  occupied: '#EF4444', // rojo
  daily: '#E5E7EB',    // gris / blanco
  blocked: '#111827',  // negro
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

const SHIFT_META: Record<string, { icon: string; bg: string; time: string; hours: number }> = {
  am: { icon: '🌅', bg: '#DBEAFE', time: '07:00–15:30', hours: 8.5 },
  pm: { icon: '🌇', bg: '#FEF3C7', time: '12:00–20:30', hours: 8.5 },
  off: { icon: '😴', bg: '#E5E7EB', time: '', hours: 0 },
  leave: { icon: '🏖️', bg: '#DCFCE7', time: '', hours: 0 },
};
const SHIFT_CYCLE = ['', 'am', 'pm', 'off', 'leave'];

const FLOORS = [
  { f: '-1', ids: ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08'] },
  { f: '0', ids: ['001', '002', '003', '004', '005', '006', '007', '008', '009'] },
  { f: '1', ids: ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110'] },
  { f: '2', ids: ['201', '202', '203', '204', '205', '206', '207', '208', '209', '210'] },
  { f: '3', ids: ['301', '302', '303', '304', '305'] },
];
const OCCUPIED_DEMO = ['001', '003', '006', 'G02', '101', '103', '105', '108', '203', '205', '301', '302'];
const CHECKOUT_DEMO = ['104', '206'];

const initialRoomStatus = (id: string) => {
  if (id === '202') return 'cleaning';
  if (id === '204') return 'blocked';
  if (id === '201') return 'daily';
  if (id === '210') return 'ready';
  if (OCCUPIED_DEMO.includes(id)) return 'occupied';
  if (CHECKOUT_DEMO.includes(id)) return 'checkout';
  return 'ready';
};
const buildRooms = () =>
  FLOORS.flatMap(({ f, ids }) =>
    ids.map(id => ({ id, floor: f, status: initialRoomStatus(id), prevStatus: id === '204' ? 'checkout' : null }))
  );

const INITIAL_STAFF = [
  { id: 's1', name: 'Laura', role: 'governess' },
  { id: 's2', name: 'Daniel', role: 'cleaning' },
  { id: 's3', name: 'Claire', role: 'cleaning' },
  { id: 's4', name: 'Sofía', role: 'equipier' },
  { id: 's5', name: 'Marc', role: 'maintenance' },
];

const INITIAL_TASKS = [
  { id: 'gt1', targetRole: 'cleaning', targetName: 'Daniel', taskText: 'Revisar cortinas y cristales en habitación 202', status: 'pending' },
  { id: 'gt2', targetRole: 'equipier', targetName: 'Sofía', taskText: 'Subir stock de toallas grandes a la planta 2', status: 'pending' },
  { id: 'gt3', targetRole: 'maintenance', targetName: 'Marc', taskText: 'Reparar aire acondicionado en habitación 204', status: 'pending' },
];

// category: 'towels' | 'sheets'. "key" enlaza con la traducción; si la gobernante cambia el nombre se guarda en "name".
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
];

// taskType: 'inOut' | 'daily' | 'out'
const INITIAL_ASSIGNED = [
  { id: 'r1', room: '202', taskType: 'inOut', badgeColor: '#EF4444', guestName: 'Jean Dupont', workStatus: 'in_progress', inspected: false, linen: null },
  { id: 'r2', room: '201', taskType: 'daily', badgeColor: '#0284C7', guestName: 'Marie Curie', workStatus: 'done', inspected: true, linen: { largeTowels: 2, mediumTowels: 2, faceTowels: 2, bathMat: 1, pillowcases: 4 } },
  { id: 'r3', room: '204', taskType: 'daily', badgeColor: '#0284C7', guestName: 'Marc Lefevre', workStatus: 'in_progress', inspected: false, linen: null },
  { id: 'r4', room: '210', taskType: 'out', badgeColor: '#10B981', guestName: 'Sophie Marceau', workStatus: 'done', inspected: true, linen: null },
];

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

/* ============================================================
   PANTALLA PRINCIPAL
   ============================================================ */
export default function HomeScreen() {
  const [currentLang, setCurrentLang] = useState('es');

  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem('@hotel_app_lang').then(savedLang => {
        if (savedLang && translations[savedLang]) setCurrentLang(savedLang);
      }).catch(() => {});
    }, [])
  );

  const changeLanguage = async (langCode: string) => {
    setCurrentLang(langCode);
    try { await AsyncStorage.setItem('@hotel_app_lang', langCode); }
    catch (error) { console.error('Error al guardar idioma:', error); }
  };

  const t = translations[currentLang] || translations.es;

  /* ---------- Datos persistentes ---------- */
  const [staff, setStaff] = useState<any[]>(INITIAL_STAFF);
  const [governessTasks, setGovernessTasks] = useState<any[]>(INITIAL_TASKS);
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<any[]>(DEFAULT_CATALOG);
  const [reports, setReports] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>(buildRooms());
  const [assignedRooms, setAssignedRooms] = useState<any[]>(INITIAL_ASSIGNED);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const raw = await AsyncStorage.getItem(HOTEL_STORAGE_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (Array.isArray(d.staff)) setStaff(d.staff);
          if (Array.isArray(d.governessTasks)) setGovernessTasks(d.governessTasks);
          if (d.schedule && typeof d.schedule === 'object') setSchedule(d.schedule);
          if (Array.isArray(d.catalog) && d.catalog.length) setCatalog(d.catalog);
          if (Array.isArray(d.reports)) setReports(d.reports);
          if (Array.isArray(d.rooms) && d.rooms.length) setRooms(d.rooms);
          if (Array.isArray(d.assignedRooms)) setAssignedRooms(d.assignedRooms);
        }
      } catch (error) {
        console.error('Error al cargar datos locales:', error);
      }
      setLoaded(true);
    };
    loadData();
  }, []);

  const persistNow = async () => {
    try {
      await AsyncStorage.setItem(HOTEL_STORAGE_KEY, JSON.stringify({
        staff, governessTasks, schedule, catalog, reports, rooms, assignedRooms, lastUpdated: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error('Error al guardar los datos:', error);
      return false;
    }
  };

  useEffect(() => {
    if (!loaded) return;
    persistNow();
  }, [loaded, staff, governessTasks, schedule, catalog, reports, rooms, assignedRooms]);

  const handleSaveAndSync = async () => {
    const ok = await persistNow();
    if (ok) notify(t.alerts.synced);
  };

  /* ---------- Sesión ---------- */
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [savedUser, setSavedUser] = useState<{ username: string; role: string } | null>(null);

  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

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

  // Lencería (toallas / sábanas)
  const [linenModal, setLinenModal] = useState<{ item: any; category: string } | null>(null);
  const [linenForm, setLinenForm] = useState<Record<string, number>>({});

  // Mantenimiento
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [reportModalRoom, setReportModalRoom] = useState<string | null>(null);
  const [reportText, setReportText] = useState('');

  // Equipo / contratos
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('cleaning');

  // Utensilios
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('towels');

  // Planning
  const today = new Date();
  const [planYear, setPlanYear] = useState(today.getFullYear());
  const [planMonth, setPlanMonth] = useState(today.getMonth());
  const [planWeek, setPlanWeek] = useState(() => findWeekIndex(today));

  const getRole = () => selectedRole || savedUser?.role || '';
  const isRoomBlocked = (roomNumber: string) => rooms.find(r => r.id === roomNumber)?.status === 'blocked';
  const itemName = (it: any) => it.name || t.items[it.key] || '';
  const workLabel = (w: string) => (w === 'done' ? t.dashboard.work.done : w === 'in_progress' ? t.dashboard.work.inCleaning : t.dashboard.work.notDone);

  /* ---------- Acceso ---------- */
  const loginAs = (name: string, role: string) => {
    setUsername(name);
    setIsLoggedIn(true);
    setSavedUser({ username: name, role });
    setActiveViewMode('dashboard');
  };

  const handleLogin = () => {
    if (!username.trim()) { notify(t.alerts.nameRequired); return; }
    loginAs(username.trim(), selectedRole || 'cleaning');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSelectedRole(null);
    setUsername('');
    setPin('');
    setSavedUser(null);
    setActiveViewMode('dashboard');
    setOpenWorkMenu(null);
  };

  /* ---------- Habitaciones ---------- */
  const applyRoomStatus = (roomNumber: string, status: string) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomNumber) return r;
      const prevStatus = status === 'blocked' ? (r.status === 'blocked' ? r.prevStatus : r.status) : r.prevStatus;
      return { ...r, status, prevStatus };
    }));
    const mapWork: Record<string, string> = { checkout: 'not_started', cleaning: 'in_progress', ready: 'done' };
    if (mapWork[status]) {
      setAssignedRooms(prev => prev.map(a => (a.room === roomNumber ? { ...a, workStatus: mapWork[status] } : a)));
    }
  };

  const changeWork = (item: any, work: string) => {
    const role = getRole();
    if (role !== 'cleaning' && role !== 'governess') { notify(t.alerts.noPermission); return; }
    if (isRoomBlocked(item.room)) { notify(t.alerts.roomBlocked); return; }
    setAssignedRooms(prev => prev.map(a => (a.id === item.id ? { ...a, workStatus: work } : a)));
    const isDaily = item.taskType === 'daily';
    const status = work === 'in_progress' ? 'cleaning' : work === 'done' ? (isDaily ? 'occupied' : 'ready') : (isDaily ? 'daily' : 'checkout');
    setRooms(prev => prev.map(r => (r.id === item.room ? { ...r, status } : r)));
  };

  const toggleRoomBlock = (roomNumber: string) => {
    const role = getRole();
    if (role !== 'governess' && role !== 'maintenance') { notify(t.alerts.noPermission); return; }
    const room = rooms.find(r => r.id === roomNumber);
    if (!room) return;
    if (room.status === 'blocked') applyRoomStatus(roomNumber, room.prevStatus || 'checkout');
    else applyRoomStatus(roomNumber, 'blocked');
  };

  const toggleInspection = (itemId: string, room: string) => {
    if (getRole() !== 'governess') { notify(t.alerts.noPermission); return; }
    if (isRoomBlocked(room)) { notify(t.alerts.roomBlocked); return; }
    setAssignedRooms(prev => prev.map(a => (a.id === itemId ? { ...a, inspected: !a.inspected } : a)));
  };

  /* ---------- Tareas ---------- */
  const openTaskModal = () => {
    const firstRole = 'cleaning';
    setSelectedTargetRole(firstRole);
    setSelectedTargetStaff(staff.find(s => s.role === firstRole)?.id || null);
    setNewTaskText('');
    setNewTaskModalVisible(true);
  };

  const pickTaskRole = (role: string) => {
    setSelectedTargetRole(role);
    setSelectedTargetStaff(staff.find(s => s.role === role)?.id || null);
  };

  const handleGovernessTask = () => {
    if (!newTaskText.trim()) { notify(t.alerts.taskEmpty); return; }
    const person = staff.find(s => s.id === selectedTargetStaff);
    const newTask = {
      id: uid('gt'),
      targetRole: selectedTargetRole,
      targetName: person ? person.name : '',
      taskText: newTaskText.trim(),
      status: 'pending'
    };
    setGovernessTasks([newTask, ...governessTasks]);
    setNewTaskText('');
    setNewTaskModalVisible(false);
    notify(t.alerts.taskSent);
  };

  const toggleTaskStatus = (taskId: string) => {
    setGovernessTasks(governessTasks.map(task => (task.id === taskId ? { ...task, status: task.status === 'pending' ? 'done' : 'pending' } : task)));
  };

  /* ---------- Lencería ---------- */
  const openLinen = (item: any, category: string) => {
    const role = getRole();
    if (role !== 'cleaning' && role !== 'governess') { notify(t.alerts.noPermission); return; }
    if (isRoomBlocked(item.room)) { notify(t.alerts.roomBlocked); return; }
    const form: Record<string, number> = {};
    catalog.filter(c => c.category === category).forEach(c => { form[c.id] = c.qty || 0; });
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
    setAssignedRooms(prev => prev.map(a => {
      if (a.id !== item.id) return a;
      const merged: Record<string, number> = { ...(a.linen || {}) };
      idsInCategory.forEach(id => { delete merged[id]; });
      Object.keys(linenForm).forEach(id => { if (linenForm[id] > 0) merged[id] = linenForm[id]; });
      return { ...a, linen: merged };
    }));
    setLinenModal(null);
    notify(t.alerts.linenSaved);
  };

  const summarizeLinen = (linen: Record<string, number> | null) => {
    if (!linen) return '';
    return Object.keys(linen)
      .filter(id => linen[id] > 0)
      .map(id => {
        const it = catalog.find(c => c.id === id);
        return it ? `${linen[id]} × ${itemName(it)}` : null;
      })
      .filter(Boolean)
      .join(', ');
  };

  /* ---------- Mantenimiento ---------- */
  const submitReport = () => {
    if (!reportText.trim()) { notify(t.alerts.reportEmpty); return; }
    setReports(prev => [{
      id: uid('rp'), room: reportModalRoom, text: reportText.trim(),
      author: username || savedUser?.username || '', date: new Date().toISOString()
    }, ...prev]);
    setReportText('');
    setReportModalRoom(null);
    notify(t.alerts.reportSent);
  };

  /* ---------- Equipo ---------- */
  const addStaffMember = () => {
    if (!newStaffName.trim()) { notify(t.alerts.nameRequired); return; }
    setStaff(prev => [...prev, { id: uid('s'), name: newStaffName.trim(), role: newStaffRole }]);
    setNewStaffName('');
  };
  const removeStaffMember = (id: string) => setStaff(prev => prev.filter(s => s.id !== id));

  /* ---------- Utensilios ---------- */
  const updateCatalogItem = (id: string, patch: any) => setCatalog(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  const removeCatalogItem = (id: string) => setCatalog(prev => prev.filter(c => c.id !== id));
  const addCatalogItem = () => {
    if (!newItemName.trim()) { notify(t.alerts.nameRequired); return; }
    setCatalog(prev => [...prev, { id: uid('it'), name: newItemName.trim(), category: newItemCategory, qty: 0 }]);
    setNewItemName('');
  };

  /* ---------- Planning ---------- */
  const changeMonth = (delta: number) => {
    const d = new Date(planYear, planMonth + delta, 1);
    setPlanYear(d.getFullYear());
    setPlanMonth(d.getMonth());
    setPlanWeek(0);
  };

  const cycleShift = (staffId: string, key: string) => {
    const role = getRole();
    if (role !== 'governess' && role !== 'direction') return;
    setSchedule(prev => {
      const k = `${staffId}|${key}`;
      const idx = SHIFT_CYCLE.indexOf(prev[k] || '');
      const next = SHIFT_CYCLE[(idx + 1) % SHIFT_CYCLE.length];
      const copy = { ...prev };
      if (!next) delete copy[k]; else copy[k] = next;
      return copy;
    });
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

  const PlusButton = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity style={styles.plusBtn} onPress={onPress}>
      <Text style={styles.plusBtnText}>+</Text>
    </TouchableOpacity>
  );

  /* ============================================================
     PANTALLA CON SESIÓN INICIADA
     ============================================================ */
  if (isLoggedIn || savedUser) {
    const roleKey = getRole() || 'cleaning';
    const roleMeta = rolesList.find(r => r.id === roleKey);
    const currentName = username || savedUser?.username || '';

    const isDirection = roleKey === 'direction';
    const isGoverness = roleKey === 'governess';
    const isReception = roleKey === 'reception';
    const canEditPlanning = isDirection || isGoverness;

    // Pestañas por perfil
    let tabs: { id: string; label: string }[] = [];
    if (isDirection) tabs = [
      { id: 'dashboard', label: t.feed.tabDashboard }, { id: 'map', label: t.feed.tabMap },
      { id: 'planning', label: t.feed.tabPlanning }, { id: 'staff', label: t.feed.tabStaff },
    ];
    else if (isGoverness) tabs = [
      { id: 'dashboard', label: t.feed.tabDashboard }, { id: 'map', label: t.feed.tabMap },
      { id: 'planning', label: t.feed.tabPlanning }, { id: 'items', label: t.feed.tabItems },
    ];
    else if (!isReception) tabs = [
      { id: 'dashboard', label: t.feed.tabDashboard }, { id: 'planning', label: t.feed.tabPlanning },
    ];
    const activeTab = isReception ? 'map' : (tabs.some(x => x.id === activeViewMode) ? activeViewMode : 'dashboard');

    const myDelegatedTasks = governessTasks.filter(task =>
      task.targetRole === roleKey && (!task.targetName || task.targetName === currentName)
    );

    const me = staff.find(s => s.name === currentName);
    const todayShift = me ? schedule[`${me.id}|${dateKey(new Date())}`] : '';
    const todayShiftText = todayShift && SHIFT_META[todayShift]
      ? (SHIFT_META[todayShift].time || t.planning[todayShift])
      : '—';

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

    /* ----- Planning ----- */
    const renderPlanning = () => {
      const weeks = getWeeks(planYear, planMonth);
      const weekIdx = Math.min(planWeek, weeks.length - 1);
      const week = weeks[weekIdx];
      const visibleStaff = canEditPlanning ? staff : staff.filter(s => s.name === currentName);
      const todayKey = dateKey(new Date());

      return (
        <View style={styles.feedCard}>
          <View style={styles.feedCardHeader}>
            <Text style={styles.feedCardTitle}>{t.planning.title}</Text>
            <Text style={styles.feedCardSubtitle}>{canEditPlanning ? t.planning.hint : t.planning.hintView}</Text>
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

          <View style={styles.legendRow}>
            {['am', 'pm', 'off', 'leave'].map(s => (
              <View key={s} style={styles.legendItem}>
                <Text style={{ fontSize: 14 }}>{SHIFT_META[s].icon}</Text>
                <Text style={styles.legendText}>{t.planning[s]}{SHIFT_META[s].time ? ` ${SHIFT_META[s].time}` : ''}</Text>
              </View>
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
                        <Text style={styles.planRoleText} numberOfLines={1}>{t.roles[s.role]?.title}</Text>
                      </View>
                      {week.map((d, i) => {
                        const key = dateKey(d);
                        const inMonth = d.getMonth() === planMonth;
                        const code = schedule[`${s.id}|${key}`] || '';
                        if (code && SHIFT_META[code]) total += SHIFT_META[code].hours;
                        return (
                          <TouchableOpacity
                            key={i}
                            disabled={!inMonth || !canEditPlanning}
                            onPress={() => cycleShift(s.id, key)}
                            style={[styles.planCell, { backgroundColor: code ? SHIFT_META[code].bg : '#F8FAFC' }, !inMonth && { opacity: 0.35 }]}
                          >
                            <Text style={styles.planCellText}>{code ? SHIFT_META[code].icon : ''}</Text>
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

    /* ----- Equipo y contratos (Dirección) ----- */
    const renderStaff = () => (
      <View style={styles.feedCard}>
        <View style={styles.feedCardHeader}>
          <Text style={styles.feedCardTitle}>{t.staff.title}</Text>
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{t.staff.addTitle}</Text>
          <Text style={styles.inputLabel}>{t.staff.name}</Text>
          <TextInput style={styles.input} placeholder={t.staff.namePH} placeholderTextColor="#64748B" value={newStaffName} onChangeText={setNewStaffName} />
          <Text style={styles.inputLabel}>{t.staff.role}</Text>
          <View style={styles.pillRow}>
            {STAFF_ROLES.map(r => (
              <TouchableOpacity key={r} style={[styles.deptPill, newStaffRole === r && styles.deptPillActive]} onPress={() => setNewStaffRole(r)}>
                <Text style={[styles.deptPillText, newStaffRole === r && styles.deptPillTextActive]} numberOfLines={1}>{t.roles[r].title}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.actionFeedButton, { backgroundColor: '#1E293B' }]} onPress={addStaffMember}>
            <Text style={styles.actionFeedButtonText}>{t.staff.save}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{t.staff.listTitle} ({staff.length})</Text>
          {staff.length === 0 && <Text style={styles.emptyText}>{t.staff.empty}</Text>}
          <View style={styles.roomsNotesList}>
            {staff.map(s => {
              const meta = rolesList.find(r => r.id === s.role);
              return (
                <View key={s.id} style={[styles.roomNoteRow, { borderLeftColor: meta?.color }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noteRoomNum}>{s.name}</Text>
                    <Text style={styles.guestNameText}>{meta?.icon} {t.roles[s.role]?.title}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => removeStaffMember(s.id)}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );

    /* ----- Utensilios (Gobernante) ----- */
    const renderInventory = () => (
      <View style={styles.feedCard}>
        <View style={styles.feedCardHeader}>
          <Text style={styles.feedCardTitle}>{t.inventory.title}</Text>
          <Text style={styles.feedCardSubtitle}>{t.inventory.sub}</Text>
        </View>

        {(['towels', 'sheets'] as const).map(cat => (
          <View key={cat} style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>{cat === 'towels' ? '🛁 ' : '🛏️ '}{t.cleaning[cat]}</Text>
            {catalog.filter(c => c.category === cat).map(c => (
              <View key={c.id} style={styles.invRow}>
                <TextInput
                  style={styles.invInput}
                  value={itemName(c)}
                  onChangeText={txt => updateCatalogItem(c.id, { name: txt })}
                />
                <View style={styles.counterControls}>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => updateCatalogItem(c.id, { qty: Math.max(0, (c.qty || 0) - 1) })}>
                    <Text style={styles.counterBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{c.qty || 0}</Text>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => updateCatalogItem(c.id, { qty: (c.qty || 0) + 1 })}>
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
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
          <View style={styles.pillRow}>
            {(['towels', 'sheets'] as const).map(cat => (
              <TouchableOpacity key={cat} style={[styles.deptPill, newItemCategory === cat && styles.deptPillActive]} onPress={() => setNewItemCategory(cat)}>
                <Text style={[styles.deptPillText, newItemCategory === cat && styles.deptPillTextActive]}>{t.cleaning[cat]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.actionFeedButton, { backgroundColor: '#5b21b6' }]} onPress={addCatalogItem}>
            <Text style={styles.actionFeedButtonText}>{t.inventory.add}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    /* ----- Tareas asignadas al trabajador ----- */
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
                onPress={() => toggleTaskStatus(task.id)}
              >
                <Text style={styles.taskStatusText}>{task.status === 'done' ? t.dashboard.completed : t.dashboard.pending}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    ) : null;

    const occupiedCount = rooms.filter(r => r.status === 'occupied' || r.status === 'daily').length;
    const occupancyPct = rooms.length ? Math.round((occupiedCount / rooms.length) * 100) : 0;
    const blockedCount = rooms.filter(r => r.status === 'blocked').length;
    const movementsCount = assignedRooms.filter(a => a.taskType !== 'daily').length;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.feedContainer}>
          {renderLangBar()}

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

          {/* Línea verde pequeña: usuario en línea */}
          <View style={styles.onlineBar}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>{t.feed.online}</Text>
          </View>

          {tabs.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={styles.tabsRow}>
              {tabs.map(tab => (
                <TouchableOpacity key={tab.id} style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]} onPress={() => setActiveViewMode(tab.id)}>
                  <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {activeTab === 'map' && renderMap()}
          {activeTab === 'planning' && renderPlanning()}
          {activeTab === 'staff' && renderStaff()}
          {activeTab === 'items' && renderInventory()}

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

              {/* ===== GOBERNANTE ===== */}
              {isGoverness && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>{t.dashboard.governessTitle}</Text>
                  <Text style={styles.directionSubText}>{t.dashboard.governessSub}</Text>

                  <View style={styles.titleWithPlus}>
                    <Text style={[styles.sectionTitle, { flex: 1, marginBottom: 0 }]}>{t.dashboard.activeTasksTitle}</Text>
                    <PlusButton onPress={openTaskModal} />
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
                          onPress={() => toggleTaskStatus(task.id)}
                        >
                          <Text style={styles.taskStatusText}>{task.status === 'done' ? t.dashboard.completed : t.dashboard.pending}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

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
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => setReports(prev => prev.filter(x => x.id !== rp.id))}>
                            <Text style={styles.deleteBtnText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={[styles.sectionTitle, { marginTop: 18 }]}>{t.dashboard.inspectionTitle}</Text>
                  <View style={styles.roomsNotesList}>
                    {assignedRooms.map(item => {
                      const blocked = isRoomBlocked(item.room);
                      const leftBorderColor = blocked ? '#DC2626' : item.badgeColor;
                      const dotBg = blocked ? '#DC2626' : WORK_COLORS[item.workStatus];
                      return (
                        <View key={item.id} style={[styles.roomNoteRow, { borderLeftColor: leftBorderColor, backgroundColor: blocked ? '#FEF2F2' : '#FFFFFF' }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <View style={[styles.statusDot, { backgroundColor: dotBg }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.noteRoomNum}>
                                {t.common.room} {item.room} ({t.dashboard.taskTypes[item.taskType]}) {blocked ? t.dashboard.blockedTag : ''}
                              </Text>
                              <Text style={styles.guestNameText}>{t.dashboard.guestLabel}{item.guestName}</Text>
                              <Text style={styles.bedHistoryNormal}>{t.dashboard.cleaningLabel}{workLabel(item.workStatus)}</Text>
                              {item.linen && summarizeLinen(item.linen) !== '' && (
                                <Text style={styles.bedHistoryAlert}>{t.dashboard.prevRecord}{summarizeLinen(item.linen)}</Text>
                              )}
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
                                onPress={() => toggleInspection(item.id, item.room)}
                              >
                                <Text style={styles.inspectBtnText}>{item.inspected ? t.dashboard.approved : t.dashboard.inspect}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ===== LIMPIEZA ===== */}
              {roleKey === 'cleaning' && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>{t.dashboard.shiftTitle}</Text>
                  <Text style={styles.shiftBadge}>
                    👤 {t.common.staff}: <Text style={{ fontWeight: 'bold' }}>{currentName}</Text> | ⏰ {t.common.shift}: <Text style={{ color: '#0284C7', fontWeight: 'bold' }}>{todayShiftText}</Text>
                  </Text>

                  <Text style={[styles.sectionTitle, { marginTop: 12 }]}>{t.dashboard.assignedRoomsTitle}</Text>
                  <View style={styles.roomsNotesList}>
                    {assignedRooms.map(item => {
                      const blocked = isRoomBlocked(item.room);
                      const linenText = summarizeLinen(item.linen);
                      return (
                        <View key={item.id} style={[styles.roomNoteRow, { borderLeftColor: blocked ? '#DC2626' : item.badgeColor, backgroundColor: blocked ? '#FEF2F2' : '#FFFFFF' }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                            <View style={[styles.statusDot, { marginTop: 4, backgroundColor: blocked ? '#DC2626' : WORK_COLORS[item.workStatus] }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.noteRoomNum}>{t.common.room} {item.room} {blocked ? t.dashboard.blockedTag : ''}</Text>
                              <Text style={styles.guestNameText}>{t.dashboard.guestLabel}{item.guestName}</Text>

                              {linenText ? (
                                <Text style={styles.bedHistoryAlert}>{t.dashboard.prevRecord}{linenText}</Text>
                              ) : (
                                <Text style={styles.bedHistoryNormal}>{t.dashboard.noLinen}</Text>
                              )}

                              {!blocked && (
                                <View style={{ marginTop: 6, gap: 8 }}>
                                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                    <TouchableOpacity style={styles.bedChangeBtn} onPress={() => openLinen(item, 'towels')}>
                                      <Text style={styles.bedChangeBtnText}>🛁 {t.cleaning.towels}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.bedChangeBtn} onPress={() => openLinen(item, 'sheets')}>
                                      <Text style={styles.bedChangeBtnText}>🛏️ {t.cleaning.sheets}</Text>
                                    </TouchableOpacity>
                                  </View>

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
                                </View>
                              )}

                              {blocked && <Text style={styles.blockedWarningText}>{t.dashboard.blockedWarning}</Text>}
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                            <Text style={[styles.noteTaskBadge, { backgroundColor: item.badgeColor }]}>{t.dashboard.taskTypes[item.taskType]}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

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

              {/* ===== EQUIPIER ===== */}
              {roleKey === 'equipier' && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>{t.dashboard.equipierTitle}</Text>
                  <Text style={styles.directionSubText}>{t.dashboard.equipierSub}</Text>
                </View>
              )}

              {renderMyTasks()}
            </View>
          )}

          <TouchableOpacity style={[styles.actionFeedButton, { backgroundColor: roleMeta?.color, marginTop: 14 }]} onPress={handleSaveAndSync}>
            <Text style={styles.actionFeedButtonText}>{t.feed.syncBtn}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ===== MODAL: cambiar estado de habitación (plano) ===== */}
        <Modal visible={!!statusModalRoom} animationType="fade" transparent={true}>
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
        <Modal visible={newTaskModalVisible} animationType="slide" transparent={true}>
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
        <Modal visible={!!linenModal} animationType="slide" transparent={true}>
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
        <Modal visible={!!reportModalRoom} animationType="slide" transparent={true}>
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
      </SafeAreaView>
    );
  }

  /* ============================================================
     MENÚ DE PERFILES
     ============================================================ */
  if (!selectedRole) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {renderLangBar()}

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
                  onPress={() => setSelectedRole(role.id)}
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
          </View>
        </ScrollView>

        <Modal visible={helpModalVisible} animationType="slide" transparent={true}>
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

        <Modal visible={termsModalVisible} animationType="slide" transparent={true}>
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
      </SafeAreaView>
    );
  }

  /* ============================================================
     ACCESO DEL PERFIL SELECCIONADO
     ============================================================ */
  const currentRoleObj = rolesList.find(r => r.id === selectedRole);
  const currentRoleInfo = t.roles[selectedRole] || {};
  const roleStaff = staff.filter(s => s.role === selectedRole);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.formContainer}>
        {renderLangBar()}

        <View style={[styles.loginHeaderBadge, { backgroundColor: currentRoleObj?.color }]}>
          <Text style={styles.loginBadgeText}>{currentRoleObj?.icon} {currentRoleInfo?.title}</Text>
        </View>

        <Text style={styles.welcomeText}>{t.login.welcome}</Text>

        {STAFF_ROLES.includes(selectedRole) ? (
          <>
            <Text style={styles.loginSub}>{t.login.pickName}</Text>
            {roleStaff.length === 0 ? (
              <Text style={[styles.emptyText, { textAlign: 'center', marginBottom: 16 }]}>{t.login.noStaff}</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {roleStaff.map(s => (
                  <TouchableOpacity key={s.id} style={[styles.employeeBtn, { borderColor: currentRoleObj?.color }]} onPress={() => loginAs(s.name, selectedRole)}>
                    <View style={[styles.avatarPlaceholder, { backgroundColor: currentRoleObj?.color }]}>
                      <Text style={styles.avatarText}>{s.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.employeeName}>{s.name}</Text>
                    <Text style={[styles.employeeArrow, { color: currentRoleObj?.color }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.loginSub}>{t.login.sub}</Text>

            <Text style={styles.inputLabel}>{t.login.userLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.login.userPlaceholder}
              placeholderTextColor="#64748B"
              value={username}
              onChangeText={setUsername}
            />

            <Text style={styles.inputLabel}>{t.login.pinLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder="••••"
              placeholderTextColor="#64748B"
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              value={pin}
              onChangeText={setPin}
            />

            <TouchableOpacity style={[styles.loginButton, { backgroundColor: currentRoleObj?.color }]} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>{t.login.btn}</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedRole(null)}>
          <Text style={styles.backButtonText}>{t.login.back}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ============================================================
   ESTILOS
   ============================================================ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F2FE' },
  scrollContainer: { padding: 12, maxWidth: 850, alignSelf: 'center', width: '100%' },

  langBar: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  langChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BAE6FD' },
  langChipActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  langChipText: { fontSize: 11, fontWeight: 'bold', color: '#0369A1' },
  langChipTextActive: { color: '#FFFFFF' },

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

  footerNav: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 15, paddingBottom: 15 },
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
  planNameCell: { width: 78, paddingRight: 4 },
  planNameText: { fontSize: 12.5, fontWeight: 'bold', color: '#0F172A' },
  planRoleText: { fontSize: 9.5, color: '#64748B' },
  planHeadCell: { width: 40, alignItems: 'center', paddingVertical: 3, marginHorizontal: 1, borderRadius: 6 },
  planHeadToday: { backgroundColor: '#FEF3C7' },
  planHeadDay: { fontSize: 10, fontWeight: 'bold', color: '#475569' },
  planHeadNum: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  planCell: { width: 40, height: 38, marginHorizontal: 1, borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  planCellText: { fontSize: 17 },
  planHoursCell: { width: 36, alignItems: 'center' },
  planHoursText: { fontSize: 11.5, fontWeight: 'bold', color: '#0F172A' },

  // Utensilios
  invRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  invInput: { flex: 1, backgroundColor: '#FFFFFF', color: '#0F172A', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, fontSize: 12.5, borderWidth: 1, borderColor: '#CBD5E1' },
});
