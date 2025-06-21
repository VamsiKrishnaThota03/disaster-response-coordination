import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
  useColorModeValue,
} from '@chakra-ui/react';

const BACKEND_URL = 'http://localhost:3001';

const DisasterForm = ({ onDisasterCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  // Dark mode colors
  const bgColor = useColorModeValue('gray.800', 'gray.800');
  const borderColor = useColorModeValue('gray.700', 'gray.700');
  const labelColor = useColorModeValue('gray.100', 'gray.100');
  const inputBg = useColorModeValue('gray.700', 'gray.700');
  const inputColor = useColorModeValue('white', 'white');
  const placeholderColor = useColorModeValue('gray.400', 'gray.400');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate form data
      if (!formData.title.trim() || !formData.description.trim()) {
        throw new Error('Title and description are required');
      }

      const response = await fetch(`${BACKEND_URL}/api/disasters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          owner_id: 'netrunnerX', // Mock user ID
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to create disaster');
      }

      toast({
        title: 'Disaster Created',
        description: 'New disaster has been successfully recorded.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setFormData({ title: '', description: '', tags: [] });
      onDisasterCreated();
    } catch (error) {
      setError(error.message);
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'tags') {
      setFormData(prev => ({
        ...prev,
        tags: value.split(',').map(tag => tag.trim())
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <Box 
      as="form" 
      onSubmit={handleSubmit} 
      bg={bgColor}
      borderRadius="md" 
      borderWidth="1px"
      borderColor={borderColor}
      p={6}
    >
      <VStack spacing={4}>
        {error && (
          <Alert status="error" borderRadius="md" bg="red.900" color="white">
            <AlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormControl isRequired>
          <FormLabel color={labelColor}>Title</FormLabel>
          <Input
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter disaster title"
            bg={inputBg}
            color={inputColor}
            borderColor={borderColor}
            _placeholder={{ color: placeholderColor }}
            _hover={{ borderColor: 'gray.600' }}
            _focus={{ 
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
            }}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel color={labelColor}>Description</FormLabel>
          <Textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the disaster and its location"
            rows={4}
            bg={inputBg}
            color={inputColor}
            borderColor={borderColor}
            _placeholder={{ color: placeholderColor }}
            _hover={{ borderColor: 'gray.600' }}
            _focus={{ 
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
            }}
          />
        </FormControl>

        <FormControl>
          <FormLabel color={labelColor}>Tags</FormLabel>
          <Input
            name="tags"
            value={formData.tags.join(', ')}
            onChange={handleChange}
            placeholder="Enter tags separated by commas (e.g., flood, urgent, rescue)"
            bg={inputBg}
            color={inputColor}
            borderColor={borderColor}
            _placeholder={{ color: placeholderColor }}
            _hover={{ borderColor: 'gray.600' }}
            _focus={{ 
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
            }}
          />
        </FormControl>

        <Button
          type="submit"
          colorScheme="blue"
          width="full"
          isLoading={isLoading}
          loadingText="Creating..."
          _hover={{
            transform: 'translateY(-1px)',
            shadow: 'lg'
          }}
        >
          Create Disaster Report
        </Button>
      </VStack>
    </Box>
  );
};

export default DisasterForm; 