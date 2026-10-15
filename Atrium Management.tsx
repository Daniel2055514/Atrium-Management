import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../services/firebaseConfig';

interface Habitacion {
  id: string;
  numero: string | number;
  tipo?: string;
  estado?: 'Disponible' | 'Ocupada' | 'Check-in' | 'Check-out' | 'Mantenimiento';
  huesped?: string;
  fechaEntrada?: string;
  fechaSalida?: string;
}

export default function RecepcionTabScreen() {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal de Edición de datos del huésped
  const [selectedRoom, setSelectedRoom] = useState<Habitacion | null>(null);
  const [nombreHuesped, setNombreHuesped] = useState('');
  const [fechaEntrada, setFechaEntrada] = useState('');
  const [fechaSalida, setFechaSalida] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'habitaciones'),
      (snapshot) => {
        const lista = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Habitacion[];

        lista.sort((a, b) => Number(a.numero) - Number(b.numero));
        setHabitaciones(lista);
        setLoading(false);
      },
      (error) => {
        console.error('Error al escuchar habitaciones:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Abrir ventana para editar huésped y fechas
  const abrirEdicion = (item: Habitacion) => {
    setSelectedRoom(item);
    setNombreHuesped(item.huesped || '');
    setFechaEntrada(item.fechaEntrada || '');
    setFechaSalida(item.fechaSalida || '');
  };

  // Guardar en Firestore los cambios de Huésped y Fechas
  const guardarCambios = async () => {
    if (!selectedRoom) return;
    try {
      const roomRef = doc(db, 'habitaciones', selectedRoom.id);
      await updateDoc(roomRef, {
        huesped: nombreHuesped,
        fechaEntrada: fechaEntrada,
        fechaSalida: fechaSalida,
      });
      setSelectedRoom(null);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudieron actualizar los datos del huésped');
    }
  };

  // Cambiar estado operativo rápido
  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      const roomRef = doc(db, 'habitaciones', id);
      await updateDoc(roomRef, { estado: nuevoEstado });
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo actualizar el estado de la habitación');
    }
  };

  const getBadgeColor = (estado?: string) => {
    switch (estado) {
      case 'Disponible': return '#2e7d32';
      case 'Ocupada': return '#c62828';
      case 'Check-in': return '#0288d1';
      case 'Check-out': return '#ed6c02';
      case 'Mantenimiento': return '#7b1fa2';
      default: return '#757575';
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Cargando habitaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🛎️ Recepción - Control de Habitaciones</Text>

      <FlatList
        data={habitaciones}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.roomNumber}>Habit. {item.numero}</Text>
              <View style={[styles.badge, { backgroundColor: getBadgeColor(item.estado) }]}>
                <Text style={styles.badgeText}>{item.estado || 'Disponible'}</Text>
              </View>
            </View>

            <Text style={styles.detail}>Tipo: {item.tipo || 'Estándar'}</Text>
            <Text style={styles.detail}>Huésped: {item.huesped ? item.huesped : 'Sin asignar'}</Text>
            {item.fechaEntrada ? <Text style={styles.detail}>Entrada: {item.fechaEntrada}</Text> : null}
            {item.fechaSalida ? <Text style={styles.detail}>Salida: {item.fechaSalida}</Text> : null}

            {/* Botón para editar datos del Huésped */}
            <TouchableOpacity style={styles.editBtn} onPress={() => abrirEdicion(item)}>
              <Text style={styles.editBtnText}>✏️ Editar Huésped y Fechas</Text>
            </TouchableOpacity>

            {/* Acciones Rápidas */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#0288d1' }]}
                onPress={() => cambiarEstado(item.id, 'Check-in')}
              >
                <Text style={styles.btnText}>Check-in</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#ed6c02' }]}
                onPress={() => cambiarEstado(item.id, 'Check-out')}
              >
                <Text style={styles.btnText}>Check-out</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#7b1fa2' }]}
                onPress={() => cambiarEstado(item.id, 'Mantenimiento')}
              >
                <Text style={styles.btnText}>Mantenimiento</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#2e7d32' }]}
                onPress={() => cambiarEstado(item.id, 'Disponible')}
              >
                <Text style={styles.btnText}>Liberar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal para editar Huésped, Entrada y Salida */}
      <Modal visible={!!selectedRoom} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Habitación {selectedRoom?.numero}</Text>

            <Text style={styles.label}>Nombre del Huésped:</Text>
            <TextInput
              style={styles.input}
              value={nombreHuesped}
              onChangeText={setNombreHuesped}
              placeholder="Ej: Juan Pérez"
            />

            <Text style={styles.label}>Fecha de Entrada:</Text>
            <TextInput
              style={styles.input}
              value={fechaEntrada}
              onChangeText={setFechaEntrada}
              placeholder="Ej: 2026-10-10"
            />

            <Text style={styles.label}>Fecha de Salida:</Text>
            <TextInput
              style={styles.input}
              value={fechaSalida}
              onChangeText={setFechaSalida}
              placeholder="Ej: 2026-10-15"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#007AFF' }]} onPress={guardarCambios}>
                <Text style={styles.modalBtnText}>Guardar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#8e8e93' }]} onPress={() => setSelectedRoom(null)}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 50, backgroundColor: '#f4f6f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  roomNumber: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  detail: { fontSize: 14, color: '#475569', marginBottom: 4 },
  editBtn: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 6, marginVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  editBtnText: { color: '#0f172a', fontWeight: '600', fontSize: 13 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 14, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', padding: 10, borderRadius: 6, fontSize: 14, backgroundColor: '#f8fafc' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, gap: 10 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold' }
});
