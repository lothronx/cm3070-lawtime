import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { TextInput, Text, Card } from "react-native-paper";
import { Control, useController, FieldError } from "react-hook-form";
import { useAppTheme, SPACING, BORDER_RADIUS } from "@/theme/ThemeProvider";
import { sanitizeInput } from "@/utils/inputUtils";
import { filterClients, debounce } from "@/utils/clientUtils";
import { TaskWithClient, DbClient } from "@/types";

// Mock data for testing
const MOCK_CLIENTS: DbClient[] = [
  {
    id: 101,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "ACME Corporation",
    created_at: "2025-08-17T09:15:00+08:00",
  },
  {
    id: 102,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "New Horizons LLC",
    created_at: "2025-08-17T22:42:00+08:00",
  },
  {
    id: 103,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "Stellar Industries Inc.",
    created_at: "2025-08-18T10:30:00+08:00",
  },
  {
    id: 104,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "Global Dynamics Corp",
    created_at: "2025-08-18T14:15:00+08:00",
  },
  {
    id: 105,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "Phoenix Enterprises",
    created_at: "2025-08-19T09:45:00+08:00",
  },
];

interface ClientAutocompleteInputProps {
  control: Control<TaskWithClient>;
  name: "client_name";
  error?: FieldError;
  clients?: DbClient[];
}

const ClientAutocompleteInput: React.FC<ClientAutocompleteInputProps> = ({
  control,
  name,
  error,
  clients = MOCK_CLIENTS,
}) => {
  const { theme } = useAppTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    field: { onChange, onBlur, value },
  } = useController({
    control,
    name,
  });

  // Memoize filtered clients to avoid unnecessary recalculations
  const filteredClients = useMemo(() => {
    return filterClients(clients, searchQuery);
  }, [clients, searchQuery]);

  // Debounced search to improve performance
  const debouncedSetSearch = useMemo(() => {
    return debounce((query: string) => setSearchQuery(query), 150);
  }, []);

  // Memoized blur handler
  const handleBlur = useCallback(() => {
    try {
      const sanitized = value?.trim() ? sanitizeInput(value) : null;
      onChange(sanitized);
      // Delay hiding dropdown to allow selection
      setTimeout(() => setShowDropdown(false), 150);
    } catch (error) {
      console.warn("ClientAutocompleteInput: Error processing blur", error);
    } finally {
      onBlur();
    }
  }, [value, onChange, onBlur]);

  // Memoized client selection handler
  const handleClientSelect = useCallback(
    (clientName: string) => {
      onChange(clientName);
      setShowDropdown(false);
      setSearchQuery(clientName);
    },
    [onChange]
  );

  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <View>
        <TextInput
          label="Client"
          value={value || ""}
          onChangeText={(text) => {
            onChange(text);
            setShowDropdown(true);
            debouncedSetSearch(text);
          }}
          onFocus={() => {
            setShowDropdown(true);
            setSearchQuery(value || "");
          }}
          onBlur={handleBlur}
          mode="outlined"
          error={hasError}
          multiline={false}
          maxLength={100}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          style={{
            backgroundColor: theme.colors.surface,
          }}
          right={
            showDropdown && filteredClients.length > 0 ? (
              <TextInput.Icon icon="chevron-down" />
            ) : null
          }
          accessibilityLabel="Client input field"
          accessibilityHint="Enter or select a client name, optional field"
        />

        {showDropdown && filteredClients.length > 0 && (
          <Card
            style={[styles.dropdown, { backgroundColor: theme.colors.surface }]}
            accessibilityLabel="Client suggestions"
            accessibilityHint={`${filteredClients.length} client suggestions available`}>
            <ScrollView
              style={styles.dropdownList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}>
              {filteredClients.map((item, index) => (
                <Pressable
                  key={item.id.toString()}
                  style={styles.dropdownItem}
                  onPress={() => handleClientSelect(item.client_name)}
                  accessibilityLabel={`Select client ${item.client_name}`}
                  accessibilityHint={`Option ${index + 1} of ${filteredClients.length}`}
                  accessibilityRole="button">
                  <Text style={styles.clientName}>{item.client_name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        )}
      </View>

      {hasError && error?.message && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error.message}</Text>
      )}
    </View>
  );
};

ClientAutocompleteInput.displayName = "ClientAutocompleteInput";

export default ClientAutocompleteInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xs,
    zIndex: 999,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    maxHeight: 200,
    borderRadius: BORDER_RADIUS.md,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  clientName: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginLeft: SPACING.sm,
  },
});
