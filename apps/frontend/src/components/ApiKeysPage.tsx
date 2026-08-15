import { useNavigate } from 'react-router-dom';
import { ApiKeysPanel } from './ApiKeysPanel';

export function ApiKeysPage() {
  const navigate = useNavigate();
  return <ApiKeysPanel onBack={() => navigate('/')} />;
}
