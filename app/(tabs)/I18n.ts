import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Recursos de traducción para las vistas principales
const resources = {
  es: {
    translation: {
      welcomeTitle: "Hotel Villa Genesis",
      selectProfile: "Selecciona tu perfil operativo para iniciar",
      direction: "Dirección",
      directionDesc: "Panorama general gerencial y métricas",
      reception: "Recepción",
      receptionDesc: "Check-in / Check-out & Edición de Huéspedes",
      governess: "Gobernante",
      governessDesc: "Supervisión, inspección de salidas y bloqueos",
      cleaning: "Agente de limpieza",
      cleaningDesc: "Mantenimiento diario, inventario y estados",
      accessProfile: "Acceder al perfil"
    }
  },
  en: {
    translation: {
      welcomeTitle: "Hotel Villa Genesis",
      selectProfile: "Select your operating profile to start",
      direction: "Management",
      directionDesc: "General management overview and metrics",
      reception: "Reception",
      receptionDesc: "Check-in / Check-out & Guest Editing",
      governess: "Governor",
      governessDesc: "Supervision, departure inspection & blocks",
      cleaning: "Cleaning Agent",
      cleaningDesc: "Daily maintenance, inventory & status",
      accessProfile: "Access profile"
    }
  },
  fr: {
    translation: {
      welcomeTitle: "Hotel Villa Genesis",
      selectProfile: "Sélectionnez votre profil opérationnel pour commencer",
      direction: "Direction",
      directionDesc: "Aperçu de la gestion générale et métriques",
      reception: "Réception",
      receptionDesc: "Enregistrement / Départ & Édition des clients",
      governess: "Gouvernante",
      governessDesc: "Supervision, inspection des départs et blocages",
      cleaning: "Agent d'entretien",
      cleaningDesc: "Entretien quotidien, inventaire et états",
      accessProfile: "Accéder au profil"
    }
  },
  it: {
    translation: {
      welcomeTitle: "Hotel Villa Genesis",
      selectProfile: "Seleziona il tuo profilo operativo per iniziare",
      direction: "Direzione",
      directionDesc: "Panoramica della gestione generale e metriche",
      reception: "Ricevimento",
      receptionDesc: "Check-in / Check-out e modifica ospiti",
      governess: "Governante",
      governessDesc: "Supervisione, ispezione partenze e blocchi",
      cleaning: "Addetto alle pulizie",
      cleaningDesc: "Manutenzione giornaliera, inventario e stati",
      accessProfile: "Accedi al profilo"
    }
  },
  pt: {
    translation: {
      welcomeTitle: "Hotel Villa Genesis",
      selectProfile: "Selecione seu perfil operacional para começar",
      direction: "Direção",
      directionDesc: "Visão geral da gestão e métricas",
      reception: "Recepção",
      receptionDesc: "Check-in / Check-out e Edição de Hóspedes",
      governess: "Governanta",
      governessDesc: "Supervisão, inspeção de partidas e bloqueios",
      cleaning: "Agente de limpeza",
      cleaningDesc: "Manutenção diária, inventário e status",
      accessProfile: "Acessar perfil"
    }
  },
  ru: {
    translation: {
      welcomeTitle: "Отель Villa Genesis",
      selectProfile: "Выберите рабочий профиль для начала",
      direction: "Руководство",
      directionDesc: "Общий управленческий обзор и метрики",
      reception: "Рецепция",
      receptionDesc: "Заезд / Выезд и редактирование гостей",
      governess: "Управляющий",
      governessDesc: "Контроль, проверка выездов и блокировки",
      cleaning: "Уборочный персонал",
      cleaningDesc: "Ежедневное обслуживание, инвентарь и статусы",
      accessProfile: "Войти в профиль"
    }
  },
  uk: {
    translation: {
      welcomeTitle: "Готель Villa Genesis",
      selectProfile: "Виберіть робочий профіль для початку",
      direction: "Керівництво",
      directionDesc: "Загальний управлінський огляд та метрики",
      reception: "Рецепція",
      receptionDesc: "Заїзд / Виїзд та редагування гостей",
      governess: "Управитель",
      governessDesc: "Контроль, перевірка виїздів та блокування",
      cleaning: "Прибиральний персонал",
      cleaningDesc: "Щоденне обслуговування, інвентар та статуси",
      accessProfile: "Увійти в профіль"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es', // Idioma por defecto
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
