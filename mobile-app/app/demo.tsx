import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import {
  Text,
  Button,
  Card,
  Chip,
  FAB,
  IconButton,
  SegmentedButtons,
  Switch,
  TextInput,
  Banner,
  Snackbar,
  ProgressBar,
  Divider,
  Surface,
} from 'react-native-paper';
import { useTheme } from 'react-native-paper';

export default function ColorThemeDemo() {
  const theme = useTheme();
  const [segmentedValue, setSegmentedValue] = useState('primary');
  const [switchValue, setSwitchValue] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.onBackground,
      marginBottom: 8,
    },
    colorSwatch: {
      height: 60,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    elevationContainer: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    elevationCard: {
      width: 80,
      height: 60,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    chipContainer: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'wrap',
    },
    inputContainer: {
      gap: 12,
    },
    paletteInfo: {
      padding: 16,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 12,
      marginBottom: 16,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Color Palette Info */}
        <View style={styles.paletteInfo}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
            LawTime Color Palette
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
            Primary: Dark Blue (#013364) • Secondary: Red (#d30b0d) • Error: Light Blue (#428bca)
            {'\n'}Professional corporate aesthetic with trustworthy blue and energetic red accents
          </Text>
        </View>

        {/* Banner Demo */}
        {bannerVisible && (
          <Banner
            visible={bannerVisible}
            actions={[
              {
                label: 'Dismiss',
                onPress: () => setBannerVisible(false),
              },
            ]}
            icon="palette"
            style={{ backgroundColor: theme.colors.primaryContainer }}
          >
            LawTime Color Theme Demo - Professional Corporate Design
          </Banner>
        )}

        {/* Primary Colors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Primary Colors - Dark Blue</Text>
          
          <View style={[styles.colorSwatch, { backgroundColor: theme.colors.primary }]}>
            <Text style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
              Primary (#013364)
            </Text>
          </View>
          
          <View style={[styles.colorSwatch, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
              Primary Container
            </Text>
          </View>
        </View>

        {/* Secondary Colors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Secondary Colors - Red</Text>
          
          <View style={[styles.colorSwatch, { backgroundColor: theme.colors.secondary }]}>
            <Text style={{ color: theme.colors.onSecondary, fontWeight: 'bold' }}>
              Secondary (#d30b0d)
            </Text>
          </View>
          
          <View style={[styles.colorSwatch, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Text style={{ color: theme.colors.onSecondaryContainer, fontWeight: 'bold' }}>
              Secondary Container
            </Text>
          </View>
        </View>

        {/* Error Colors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Error Colors - Light Blue</Text>
          
          <View style={[styles.colorSwatch, { backgroundColor: theme.colors.error }]}>
            <Text style={{ color: theme.colors.onError, fontWeight: 'bold' }}>
              Error (#428bca)
            </Text>
          </View>
          
          <View style={[styles.colorSwatch, { backgroundColor: theme.colors.errorContainer }]}>
            <Text style={{ color: theme.colors.onErrorContainer, fontWeight: 'bold' }}>
              Error Container
            </Text>
          </View>
        </View>

        {/* Surface Colors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Surface & Background</Text>
          
          <Surface style={[styles.colorSwatch, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
              Surface (White)
            </Text>
          </Surface>
          
          <Surface style={[styles.colorSwatch, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontWeight: 'bold' }}>
              Surface Variant (Blue Tint)
            </Text>
          </Surface>
        </View>

        {/* Outline Colors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outline Colors</Text>
          
          <View style={[styles.colorSwatch, { 
            backgroundColor: theme.colors.surface,
            borderWidth: 2,
            borderColor: theme.colors.outline 
          }]}>
            <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
              Outline (Blue-Gray)
            </Text>
          </View>
          
          <View style={[styles.colorSwatch, { 
            backgroundColor: theme.colors.surface,
            borderWidth: 2,
            borderColor: theme.colors.outlineVariant 
          }]}>
            <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
              Outline Variant (Light Blue)
            </Text>
          </View>
        </View>

        {/* Elevation Levels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Elevation Levels - Blue Tints</Text>
          <View style={styles.elevationContainer}>
            {[0, 1, 2, 3, 4, 5].map((level) => (
              <Surface 
                key={level} 
                style={styles.elevationCard} 
                elevation={level}
              >
                <Text style={{ color: theme.colors.onSurface, fontSize: 12 }}>
                  Level {level}
                </Text>
              </Surface>
            ))}
          </View>
        </View>

        {/* Interactive Components */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interactive Components</Text>
          
          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Button 
              mode="contained" 
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
            >
              Primary Button
            </Button>
            <Button 
              mode="outlined" 
              buttonColor="transparent"
              textColor={theme.colors.primary}
            >
              Outlined Button
            </Button>
            <Button 
              mode="text"
              textColor={theme.colors.primary}
            >
              Text Button
            </Button>
          </View>
          
          <View style={styles.buttonRow}>
            <Button 
              mode="contained"
              buttonColor={theme.colors.secondary}
              textColor={theme.colors.onSecondary}
            >
              Secondary Button
            </Button>
            <Button 
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
            >
              Error Button
            </Button>
          </View>
        </View>

        {/* Chips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chips & Tags</Text>
          <View style={styles.chipContainer}>
            <Chip 
              mode="flat" 
              selected 
              selectedColor={theme.colors.primary}
              showSelectedOverlay
            >
              Selected Chip
            </Chip>
            <Chip 
              mode="outlined"
              textStyle={{ color: theme.colors.secondary }}
            >
              Outlined Chip
            </Chip>
            <Chip 
              icon="briefcase"
              style={{ backgroundColor: theme.colors.secondaryContainer }}
              textStyle={{ color: theme.colors.onSecondaryContainer }}
            >
              Legal Case
            </Chip>
            <Chip mode="flat" disabled>Disabled Chip</Chip>
          </View>
        </View>

        {/* Segmented Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segmented Controls</Text>
          <SegmentedButtons
            value={segmentedValue}
            onValueChange={setSegmentedValue}
            buttons={[
              { value: 'primary', label: 'Primary' },
              { value: 'secondary', label: 'Secondary' },
              { value: 'surface', label: 'Surface' },
            ]}
            theme={{ colors: theme.colors }}
          />
        </View>

        {/* Form Elements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Form Elements</Text>
          <View style={styles.inputContainer}>
            <TextInput
              label="Client Name"
              placeholder="Enter client name"
              mode="outlined"
              theme={{ colors: theme.colors }}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
            />
            <TextInput
              label="Case Details"
              placeholder="Enter case details"
              mode="filled"
              multiline
              numberOfLines={3}
              theme={{ colors: theme.colors }}
            />
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Switch 
                value={switchValue} 
                onValueChange={setSwitchValue}
                thumbColor={switchValue ? theme.colors.primary : theme.colors.outline}
                trackColor={{ 
                  false: theme.colors.surfaceVariant, 
                  true: theme.colors.primaryContainer 
                }}
              />
              <Text style={{ color: theme.colors.onSurface }}>Enable corporate notifications</Text>
            </View>
          </View>
        </View>

        {/* Progress & Loading */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress & Loading</Text>
          <ProgressBar progress={0.7} color={theme.colors.primary} />
          <ProgressBar progress={0.3} color={theme.colors.secondary} />
          <ProgressBar progress={0.9} color={theme.colors.error} />
        </View>

        {/* Cards - Legal Theme */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Corporate Legal Cards</Text>
          
          <Card 
            mode="contained"
            style={{ backgroundColor: theme.colors.primaryContainer }}
          >
            <Card.Title
              title="Corporate Litigation"
              subtitle="High Priority Case"
              titleStyle={{ color: theme.colors.onPrimaryContainer }}
              subtitleStyle={{ color: theme.colors.onPrimaryContainer }}
              left={(props) => (
                <IconButton 
                  {...props} 
                  icon="briefcase" 
                  iconColor={theme.colors.primary}
                />
              )}
              right={(props) => (
                <IconButton 
                  {...props} 
                  icon="dots-vertical"
                  iconColor={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              <Text style={{ color: theme.colors.onPrimaryContainer }}>
                Client: MegaCorp Industries | Federal Court | 10:30 AM
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button 
                mode="text"
                textColor={theme.colors.primary}
              >
                Review
              </Button>
              <Button 
                mode="contained"
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
              >
                Start Case
              </Button>
            </Card.Actions>
          </Card>

          <Card 
            mode="outlined"
            style={{ borderColor: theme.colors.secondary }}
          >
            <Card.Title 
              title="Contract Review" 
              subtitle="Secondary priority"
              titleStyle={{ color: theme.colors.onSurface }}
              subtitleStyle={{ color: theme.colors.secondary }}
            />
            <Card.Content>
              <Text style={{ color: theme.colors.onSurface }}>
                Professional contract analysis with corporate compliance review.
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button 
                mode="outlined"
                textColor={theme.colors.secondary}
              >
                Schedule
              </Button>
            </Card.Actions>
          </Card>
        </View>

        {/* Dividers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dividers & Separators</Text>
          <Divider style={{ backgroundColor: theme.colors.outline }} />
          <Text style={{ 
            color: theme.colors.onSurfaceVariant, 
            textAlign: 'center', 
            padding: 8 
          }}>
            Corporate section separator
          </Text>
          <Divider bold style={{ backgroundColor: theme.colors.primary }} />
        </View>

        {/* Inverse Colors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inverse Colors</Text>
          
          <View style={[styles.colorSwatch, { backgroundColor: theme.colors.inverseSurface }]}>
            <Text style={{ color: theme.colors.inverseOnSurface, fontWeight: 'bold' }}>
              Inverse Surface
            </Text>
          </View>
          
          <Button 
            mode="contained" 
            buttonColor={theme.colors.inversePrimary}
            textColor={theme.colors.primary}
          >
            Inverse Primary Button
          </Button>
        </View>

        {/* Bottom spacing for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={{
          position: 'absolute',
          margin: 16,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.secondary,
        }}
        color={theme.colors.onSecondary}
        onPress={() => setSnackbarVisible(true)}
      />

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        action={{
          label: 'Undo',
          onPress: () => {},
          labelStyle: { color: theme.colors.primary }
        }}
        style={{ backgroundColor: theme.colors.inverseSurface }}
      >
        <Text style={{ color: theme.colors.inverseOnSurface }}>
          Corporate theme interaction
        </Text>
      </Snackbar>
    </View>
  );
}