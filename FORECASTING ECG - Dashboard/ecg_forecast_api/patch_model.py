import zipfile, json, sys

src = r'd:\FORECASTING ECG\results\NB5\modelos\CNN_GRU_ATTN_final.keras'
dst = r'd:\FORECASTING ECG\results\NB5\modelos\CNN_GRU_ATTN_final_patched.keras'

z_in = zipfile.ZipFile(src, 'r')
config_raw = z_in.read('config.json').decode('utf-8')

# Patch keras.src.* module paths for Keras 2.15 compatibility
config_patched = config_raw.replace('keras.src.models.functional', 'keras.models')
config_patched = config_patched.replace('keras.src.layers', 'keras.layers')
config_patched = config_patched.replace('keras.src.initializers', 'keras.initializers')
config_patched = config_patched.replace('keras.src.regularizers', 'keras.regularizers')
config_patched = config_patched.replace('keras.src.constraints', 'keras.constraints')
config_patched = config_patched.replace('keras.src.optimizers', 'keras.optimizers')
config_patched = config_patched.replace('keras.src.dtype_policies', 'keras.dtype_policies')

# Inject output_shape for the Lambda layer to fix Keras 2.15 shape inference error
config_patched = config_patched.replace(
    '"arguments": {}}', 
    '"arguments": {}, "output_shape": [256]}'
)

z_out = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
for item in z_in.namelist():
    if item == 'config.json':
        z_out.writestr(item, config_patched)
    else:
        z_out.writestr(item, z_in.read(item))
z_out.close()
z_in.close()

cfg = json.loads(config_patched)
print(f"Patched model saved: {dst}")
print(f"Root module: {cfg.get('module')}")
print(f"Files in zip: {zipfile.ZipFile(dst).namelist()}")
