import os
import psycopg2

# Database connection details
DB_HOST = "junction.proxy.rlwy.net"
DB_PORT = "54490"
DB_NAME = "railway"
DB_USER = "postgres"
DB_PASSWORD = "UQVjevHaGDunjzEbxpcadpnCQNK5e42AD"

try:
    # Connect to the database
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cursor = conn.cursor()
    
    # First, find the user ID for Ricardo
    cursor.execute("SELECT id FROM users WHERE email = %s", ('rmazzi@gmail.com',))
    user_result = cursor.fetchone()
    
    if not user_result:
        print("❌ User not found with email: rmazzi@gmail.com")
        exit(1)
    
    user_id = user_result[0]
    print(f"✅ Found user ID: {user_id}")
    
    # Update the profile
    update_query = """
    UPDATE profiles 
    SET 
        full_name = %s,
        linkedin_url = %s,
        bio = %s,
        avatar_url = %s
    WHERE user_id = %s
    """
    
    cursor.execute(update_query, (
        'Ricardo Mazzi',
        'https://www.linkedin.com/in/ricardomazzi/',
        'B2C and B2B marketing executive, interactive media strategist, social media marketer, lead generation, front-end web developer, and project manager. Interested in cutting edge technologies and providing practical revenue-generating solutions for small to large businesses. As a Fractional CMO, Ricardo helps healthcare companies with their marketing strategy and execution, bringing years of expertise in delivering measurable results.',
        'https://files.manuscdn.com/user_upload_by_module/session_file/310519663277157978/bgWDanBYHZbslGUP.png',
        user_id
    ))
    
    conn.commit()
    print("✅ Ricardo Mazzi profile updated successfully!")
    
    # Verify the update
    cursor.execute("SELECT full_name, linkedin_url, avatar_url FROM profiles WHERE user_id = %s", (user_id,))
    result = cursor.fetchone()
    print(f"✅ Verified: Name={result[0]}, LinkedIn={result[1]}, Avatar={result[2][:50]}...")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
