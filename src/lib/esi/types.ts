export type ColonySummary = {
  last_update: string;
  num_pins: number;
  owner_id: number;
  planet_id: number;
  planet_type: string;
  solar_system_id: number;
  upgrade_level: number;
};

export type PinContent = { type_id: number; amount: number };

export type ColonyPin = {
  pin_id: number;
  type_id: number;
  latitude: number;
  longitude: number;
  contents?: PinContent[];
  expiry_time?: string;
  install_time?: string;
  last_cycle_start?: string;
  schematic_id?: number;
  factory_details?: { schematic_id: number };
  extractor_details?: {
    cycle_time: number;
    head_radius?: number;
    heads: { head_id: number; latitude: number; longitude: number }[];
    product_type_id?: number;
    qty_per_cycle?: number;
  };
};

export type ColonyRoute = {
  route_id: number;
  source_pin_id: number;
  destination_pin_id: number;
  content_type_id: number;
  quantity: number;
  waypoints?: number[];
};

export type ColonyLayout = {
  links: { source_pin_id: number; destination_pin_id: number; link_level: number }[];
  pins: ColonyPin[];
  routes: ColonyRoute[];
};
