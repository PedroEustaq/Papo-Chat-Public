import React, { useEffect } from 'react';
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, BackHandler } from 'react-native';

// Versão atual do aplicativo (só pode ser alterada no código)
const APP_VERSION = 4;

export default function VersionCheck() {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Busca a versão do sistema no Firestore
        const systemRef = doc(db, "Sistema", "SistemaGeral");
        const systemSnap = await getDoc(systemRef);

        if (!systemSnap.exists()) {
          console.error("Documento SistemaGeral não encontrado");
          return;
        }

        const systemVersion = systemSnap.data().versao;

        // Compara a versão do sistema com a versão do app
        if (systemVersion !== APP_VERSION) {
          // Mostra alerta de versão desatualizada
          if (Platform.OS === 'web') {
            // Para web, usa window.alert
            window.alert("Versão Desatualizada\nPor favor, atualize o aplicativo para a versão mais recente para continuar usando.");
            // Expulsa o usuário do app
            // Fecha o app na web
            window.close();
          } else {
            // Para mobile, usa Alert do React Native
            Alert.alert(
              "Versão Desatualizada",
              "Por favor, atualize o aplicativo para a versão mais recente para continuar usando.",
              [
                {
                  text: "OK",
                  onPress: async () => {
                    // Expulsa o usuário do app
                    

                    
                    // Fecha o app no mobile
                    BackHandler.exitApp();
                  }
                }
              ],
              { cancelable: false }
            );
          }
        }
      } catch (error) {
        console.error("Erro ao verificar versão do sistema:", error);
      }
    };

    // Verifica a versão quando o componente é montado
    checkVersion();

    // Configura um intervalo para verificar a versão periodicamente
    // 5 segundos para desenvolvimento, 5 minutos para produção
    const intervalTime = process.env.NODE_ENV === 'development' ? 5000 : 5000;
    const intervalId = setInterval(checkVersion, intervalTime);

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(intervalId);
  }, []);

  // O componente não renderiza nada visível
  return null;
}
