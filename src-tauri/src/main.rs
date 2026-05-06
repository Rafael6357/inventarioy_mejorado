#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::info;

fn main() {
    env_logger::init();
    info!("Iniciando InventarioY...");

    inventarioy_lib::run();
}