import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TermsModalScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📜 Términos y Condiciones</Text>
        <Text style={styles.headerSubtitle}>Atrium Management - Uso Operativo</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <Text style={styles.sectionTitle}>1. Uso Exclusivo del Personal</Text>
        <Text style={styles.paragraph}>
          Esta aplicación es una herramienta de trabajo de uso exclusivo para el personal autorizado del establecimiento hotelero. Queda estrictamente prohibida la divulgación o compartición de credenciales con terceros.
        </Text>

        <Text style={styles.sectionTitle}>2. Protección de Datos del Huésped (RGPD)</Text>
        <Text style={styles.paragraph}>
          Toda la información ingresada sobre los huéspedes (nombres, fechas de llegada/salida y estado de asignación) está protegida por la normativa vigente de protección de datos. El personal solo podrá consultar o modificar datos necesarios para la gestión de su turno.
        </Text>

        <Text style={styles.sectionTitle}>3. Registro de Operaciones</Text>
        <Text style={styles.paragraph}>
          Las actualizaciones de estado de habitaciones (limpieza, mantenimiento, check-in y check-out) quedan registradas en tiempo real en la base de datos central asociadas al perfil operativo en uso.
        </Text>

        <Text style={styles.sectionTitle}>4. Mantenimiento e Incidencias</Text>
        <Text style={styles.paragraph}>
          El bloqueo de habitaciones por averías o reparaciones debe ser justificado por el personal de Mantenimiento o Gobernanta para garantizar la correcta asignación en Recepción.
        </Text>

        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>Entendido y Aceptar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  header: {
    padding: 24,
    paddingTop: 40,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 22,
  },
  spacer: {
    height: 40,
  },
  footer: {
    padding: 20,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  closeBtn: {
    backgroundColor: '#0288d1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
