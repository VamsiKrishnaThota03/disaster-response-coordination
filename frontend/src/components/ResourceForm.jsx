import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
  FormHelperText,
  InputGroup,
  InputLeftElement,
  Icon,
  Text,
  Divider,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaMapMarkerAlt, FaBuilding, FaTag, FaMapPin } from 'react-icons/fa';

const BACKEND_URL = 'http://localhost:3001';

const ResourceForm = ({ disasterId, onResourceCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    location_name: '',
    latitude: '',
    longitude: '',
    status: 'active'
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
  const helperTextColor = useColorModeValue('gray.400', 'gray.400');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate form data
      if (!formData.name.trim() || !formData.type || !formData.location_name.trim()) {
        throw new Error('Name, type, and location are required');
      }

      if (!formData.latitude || !formData.longitude) {
        throw new Error('Latitude and longitude are required');
      }

      // Validate coordinates
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      
      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new Error('Invalid latitude. Must be between -90 and 90');
      }
      
      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new Error('Invalid longitude. Must be between -180 and 180');
      }

      const response = await fetch(`${BACKEND_URL}/api/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          disaster_id: disasterId,
          location: `POINT(${lng} ${lat})`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to create resource');
      }

      toast({
        title: 'Resource Added',
        description: 'New resource has been successfully recorded.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setFormData({
        name: '',
        type: '',
        location_name: '',
        latitude: '',
        longitude: '',
        status: 'active'
      });
      
      if (onResourceCreated) {
        onResourceCreated();
      }
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resourceTypes = [
    'medical',
    'shelter',
    'food',
    'water',
    'power',
    'transport',
    'communication',
    'rescue',
    'other'
  ];

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

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} width="100%">
          <FormControl isRequired>
            <FormLabel color={labelColor}>Resource Name</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <Icon as={FaBuilding} color={helperTextColor} />
              </InputLeftElement>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter resource name"
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
            </InputGroup>
          </FormControl>

          <FormControl isRequired>
            <FormLabel color={labelColor}>Resource Type</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <Icon as={FaTag} color={helperTextColor} />
              </InputLeftElement>
              <Select
                name="type"
                value={formData.type}
                onChange={handleChange}
                placeholder="Select resource type"
                bg={inputBg}
                color={inputColor}
                borderColor={borderColor}
                _placeholder={{ color: placeholderColor }}
                _hover={{ borderColor: 'gray.600' }}
                _focus={{ 
                  borderColor: 'blue.500',
                  boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
                }}
              >
                <option value="medical">Medical</option>
                <option value="shelter">Shelter</option>
                <option value="supplies">Supplies</option>
                <option value="water">Water</option>
                <option value="food">Food</option>
                <option value="power">Power</option>
                <option value="communication">Communication</option>
                <option value="transport">Transport</option>
              </Select>
            </InputGroup>
          </FormControl>
        </SimpleGrid>

        <FormControl isRequired>
          <FormLabel color={labelColor}>Location Name</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Icon as={FaMapMarkerAlt} color={helperTextColor} />
            </InputLeftElement>
            <Input
              name="location_name"
              value={formData.location_name}
              onChange={handleChange}
              placeholder="Enter location name"
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
          </InputGroup>
        </FormControl>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} width="100%">
          <FormControl isRequired>
            <FormLabel color={labelColor}>Latitude</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <Icon as={FaMapPin} color={helperTextColor} />
              </InputLeftElement>
              <Input
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="Enter latitude"
                type="number"
                step="any"
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
            </InputGroup>
            <FormHelperText color={helperTextColor}>
              Example: 37.7749
            </FormHelperText>
          </FormControl>

          <FormControl isRequired>
            <FormLabel color={labelColor}>Longitude</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <Icon as={FaMapPin} color={helperTextColor} />
              </InputLeftElement>
              <Input
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="Enter longitude"
                type="number"
                step="any"
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
            </InputGroup>
            <FormHelperText color={helperTextColor}>
              Example: -122.4194
            </FormHelperText>
          </FormControl>
        </SimpleGrid>

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
          Add Resource
        </Button>
      </VStack>
    </Box>
  );
};

export default ResourceForm; 