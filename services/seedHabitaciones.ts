import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const habitacionesHotel = [
  // Subsuelo (G)
  { id: 'G01', Numero: 'G01', Piso: 'Subsuelo', Estado: 'Limpia', Tipo: 'Doble' },
  { id: 'G02', Numero: 'G02', Piso: 'Subsuelo', Estado: 'Limpia', Tipo: 'Doble' },
  { id: 'G03', Numero: 'G03', Piso: 'Subsuelo', Estado: 'Limpia', Tipo: 'Individual' },

  // Planta 1
  { id: '101', Numero: '101', Piso: 'Planta 1', Estado: 'Limpia', Tipo: 'Doble' },
  { id: '102', Numero: '102', Piso: 'Planta 1', Estado: 'Limpia', Tipo: 'Suite' },

  // Planta 2
  { id: '201', Numero: '201', Piso: 'Planta 2', Estado: 'Limpia', Tipo: 'Doble' },
];

export const cargarHabitacionesMasivo = async () => {
  try {
    for (const hab of habitacionesHotel) {
      const { id, ...datos } = hab;
      await setDoc(doc(db, 'Habitaciones', id), datos);
    }
    console.log('¡Todas las habitaciones se crearon con éxito en Firestore!');
  } catch (error) {
    console.error('Error al cargar habitaciones:', error);
  }
};
