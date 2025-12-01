# Get the first valid IPv4 address (private network)
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -match '^10\.|^192\.168\.' } |
       Select-Object -First 1 -ExpandProperty IPAddress)

if (-not $ip) {
    Write-Host "Could not detect a valid IP. Make sure you are connected to Wi-Fi or LAN."
    exit
}

# Print the URL for other devices
Write-Host "Starting GroceryGo server..."
Write-Host "Your app will be accessible on this network at: http://$ip:3000"

# Start the server
serve . -l 3000 -s 0.0.0.0
