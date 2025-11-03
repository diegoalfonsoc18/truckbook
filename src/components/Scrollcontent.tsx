import React from "react";
import {
  Text,
  Image,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { styles } from "../Screens/Home/HomeStyles";
import { Item } from "../Screens/Home/Items";

interface ScrollContentProps {
  items: Item[];
  imageSource?: any;
  onRefresh?: () => void;
  refreshing?: boolean;
  renderBadge?: (item: Item) => React.ReactNode;
  onItemPress?: (item: Item) => void;
}

export default function Scrollcontent({
  items,
  imageSource,
  onRefresh,
  refreshing = false,
  renderBadge,
  onItemPress,
}: ScrollContentProps) {
  return (
    <View style={styles.containerScroll}>
      <ScrollView
        style={{ width: "100%", flex: 1 }}
        contentContainerStyle={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 10,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh && (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2196F3"
              colors={["#2196F3"]}
              title="Actualizando..."
            />
          )
        }>
        {/* IMAGEN */}
        {imageSource && (
          <View style={styles.containerAlert}>
            <Image source={imageSource} style={styles.imageAlert} />
          </View>
        )}

        {/* ITEMS */}
        <View style={styles.itemsContainer}>
          {items.map((item, idx) => {
            const isComponent = typeof item.icon === "function";
            const Icon = item.icon;

            return (
              <TouchableOpacity
                style={[
                  styles.itemBox,
                  { backgroundColor: item.backgroundColor || "#FFFFFF" },
                ]}
                key={item.id || idx}
                activeOpacity={0.7}
                onPress={() => onItemPress && onItemPress(item)}>
                {/* BADGE */}
                {renderBadge ? renderBadge(item) : null}

                {/* ICON */}
                <View style={styles.iconContainer}>
                  {isComponent ? (
                    <Icon width={40} height={40} />
                  ) : (
                    <Image source={item.icon} style={styles.iconItemBox} />
                  )}
                </View>

                {/* TEXT */}
                <View style={styles.textContainer}>
                  <Text style={styles.textTitle}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.textSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
