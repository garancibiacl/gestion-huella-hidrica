import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing environment variables')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify the requesting user using the provided JWT
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError) {
      console.error('Error getting user:', userError.message)
      return new Response(JSON.stringify({ error: 'Invalid token: ' + userError.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    if (!requestingUser) {
      console.error('No user found with provided token')
      return new Response(JSON.stringify({ error: 'Unauthorized - no user found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Requesting user:', requestingUser.id, requestingUser.email)

    const { data: requestingProfile, error: requestingProfileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('user_id', requestingUser.id)
      .maybeSingle()

    if (requestingProfileError) {
      console.error('Error getting requesting profile:', requestingProfileError.message)
      return new Response(JSON.stringify({ error: 'Error reading requesting user profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!requestingProfile?.organization_id) {
      console.error('Requesting user has no organization_id')
      return new Response(JSON.stringify({ error: 'Requesting user has no organization assigned' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError) {
      console.error('Error checking role:', roleError.message)
    }

    console.log('Role data:', roleData)

    if (!roleData) {
      console.error('User is not an admin')
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { email, password, full_name, role } = body
    
    console.log('Creating user with email:', email, 'role:', role)

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create user with admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createError) {
      console.error('Error creating user:', createError.message)
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('User created successfully:', newUser.user?.id)

    // Ensure new user has a profile with the same organization_id as the requesting admin
    if (newUser.user) {
      const { error: profileUpsertError } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            user_id: newUser.user.id,
            email,
            full_name: full_name ?? null,
            organization_id: requestingProfile.organization_id,
          },
          { onConflict: 'user_id' },
        )

      if (profileUpsertError) {
        console.error('Error upserting profile:', profileUpsertError.message)
        return new Response(JSON.stringify({ error: 'User created but failed to assign organization' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Wait for trigger to create the default role, then update if different
    if (role && newUser.user) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { error: updateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', newUser.user.id)

      if (updateError) {
        console.error('Error updating role:', updateError.message)
        // Try insert if update failed
        const { error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: newUser.user.id, role })
        
        if (insertError) {
          console.error('Error inserting role:', insertError.message)
        }
      }
    }

    console.log('User creation complete')

    return new Response(JSON.stringify({ 
      success: true, 
      user: { 
        id: newUser.user?.id, 
        email: newUser.user?.email 
      } 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Unexpected error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
