import { Container, VStack, Heading, useToast, Button, Box, useDisclosure, Badge, Text } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import DisasterForm from './components/DisasterForm';
import DisasterList from './components/DisasterList';
import io from 'socket.io-client';
import { BACKEND_URL, SOCKET_CONFIG } from './config';

let socket;

const initializeSocket = () => {
  try {
    if (socket) {
      socket.close();
    }
    
    console.log('Initializing socket with URL:', BACKEND_URL);
    socket = io(BACKEND_URL, SOCKET_CONFIG);
    
    return socket;
  } catch (error) {
    console.error('Socket initialization error:', error);
    return null;
  }
};

function App() {
  const [disasters, setDisasters] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    // Initialize socket connection
    const socket = initializeSocket();
    
    if (socket) {
      socket.on('connect', () => {
        console.log('Socket connected successfully');
        setIsConnected(true);
        toast({
          title: 'Connected to server',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to server: ' + error.message,
          status: 'error',
          duration: null,
          isClosable: true,
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        toast({
          title: 'Disconnected from server',
          description: `Reason: ${reason}. Attempting to reconnect...`,
          status: 'warning',
          duration: null,
          isClosable: true,
        });
      });

      socket.on('disaster_updated', () => {
        console.log('Disaster updated event received');
        fetchDisasters();
      });
    }

    // Fetch initial disasters
    fetchDisasters();

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('connect_error');
        socket.off('disconnect');
        socket.off('disaster_updated');
        socket.close();
      }
    };
  }, []);

  const fetchDisasters = async () => {
    try {
      console.log('Fetching from:', `${BACKEND_URL}/api/disasters`);
      const response = await fetch(`${BACKEND_URL}/api/disasters`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDisasters(data || []);
    } catch (error) {
      console.error('Error fetching disasters:', error);
      toast({
        title: 'Error fetching disasters',
        description: 'Please check if the server is running',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={8} align="stretch">
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center"
          pb={4}
          borderBottomWidth="1px"
          borderBottomColor="gray.700"
        >
          <Box>
            <Heading 
              size="lg" 
              color="white"
              fontWeight="600"
              letterSpacing="tight"
            >
              Disaster Response Platform
              {!isConnected && (
                <Badge 
                  ml={2} 
                  colorScheme="red" 
                  fontSize="sm"
                  verticalAlign="middle"
                >
                  Offline
                </Badge>
              )}
            </Heading>
            <Text 
              color="gray.400" 
              fontSize="sm" 
              mt={1}
            >
              Coordinate and respond to active disasters in real-time
            </Text>
          </Box>
          <Button
            colorScheme="red"
            size="md"
            onClick={onOpen}
            leftIcon={<span role="img" aria-label="alert">⚠️</span>}
            fontWeight="500"
            px={6}
            _hover={{
              transform: 'translateY(-1px)',
              shadow: 'lg'
            }}
            transition="all 0.2s"
          >
            Report New Disaster
          </Button>
        </Box>
        
        {/* Disaster Form Modal */}
        {isOpen && (
          <Box
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="rgba(0, 0, 0, 0.8)"
            zIndex="modal"
            onClick={onClose}
          >
            <Box
              maxW="600px"
              mx="auto"
              mt="100px"
              bg="gray.800"
              borderRadius="md"
              p={6}
              onClick={e => e.stopPropagation()}
              boxShadow="xl"
            >
              <DisasterForm onDisasterCreated={() => {
                fetchDisasters();
                onClose();
              }} />
            </Box>
          </Box>
        )}
        
        <DisasterList disasters={disasters} />
      </VStack>
    </Container>
  );
}

export default App;
